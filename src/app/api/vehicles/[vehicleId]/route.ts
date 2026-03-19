import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { writeUsageLog } from '@/lib/usageLogs';

function actorName(session: any) {
  return session?.user?.name || session?.user?.email || session?.user?.id || 'ไม่ทราบชื่อ';
}

// DELETE: ลบข้อมูลรถยนต์
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await context.params;

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Executive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deleted = await prisma.vehicle.delete({
      where: { id: vehicleId },
      select: { id: true, licensePlate: true },
    });

    const actor = actorName(session);
    await writeUsageLog({
      action: 'DELETE',
      path: '/admin/vehicles',
      userId: session.user.id,
      role: session.user.role as any,
      entityType: 'Vehicle',
      entityId: deleted.id,
      message: `${session.user.role === 'Executive' ? 'ผู้บริหาร' : 'แอดมิน'} ${actor} ลบรถยนต์ ${deleted.licensePlate}`,
    });

    return NextResponse.json(
      { message: 'Vehicle deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH: อัปเดตข้อมูลรถยนต์
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await context.params;

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Executive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { licensePlate, brand, model, type, capacity, passengerCapacity, currentMileage } = body;

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        licensePlate,
        brand,
        model,
        type,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        passengerCapacity: passengerCapacity !== undefined ? (passengerCapacity !== '' && passengerCapacity !== null ? parseInt(passengerCapacity, 10) : null) : undefined,
        currentMileage: currentMileage !== undefined ? (currentMileage ? parseInt(currentMileage, 10) : null) : undefined,
      },
    });

    const actor = actorName(session);
    await writeUsageLog({
      action: 'UPDATE',
      path: '/admin/vehicles',
      userId: session.user.id,
      role: session.user.role as any,
      entityType: 'Vehicle',
      entityId: updatedVehicle.id,
      message: `${session.user.role === 'Executive' ? 'ผู้บริหาร' : 'แอดมิน'} ${actor} แก้ไขรถยนต์ ${updatedVehicle.licensePlate}`,
    });

    return NextResponse.json(updatedVehicle, { status: 200 });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
