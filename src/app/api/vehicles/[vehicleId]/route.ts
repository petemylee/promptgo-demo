import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// DELETE: ลบข้อมูลรถยนต์
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await context.params;

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.vehicle.delete({
      where: { id: vehicleId },
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
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { licensePlate, brand, model, type, capacity } = body;

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        licensePlate,
        brand,
        model,
        type,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
      },
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
