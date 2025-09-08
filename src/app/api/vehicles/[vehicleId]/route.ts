import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// DELETE: ลบข้อมูลรถยนต์
export async function DELETE(
  req: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await prisma.vehicle.delete({
      where: { id: params.vehicleId },
    });
    return NextResponse.json({ message: 'Vehicle deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: อัปเดตข้อมูลรถยนต์
export async function PATCH(
  req: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { licensePlate, brand, model, type, capacity } = body;

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: params.vehicleId },
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
    console.error("Error updating vehicle:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
