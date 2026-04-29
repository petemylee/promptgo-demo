import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { type Role } from '@prisma/client';
import { authOptions } from '../auth/[...nextauth]/route';
import { writeUsageLog } from '@/lib/usageLogs';

function actorName(session: Session | null) {
  return session?.user?.name || session?.user?.email || session?.user?.id || 'ไม่ทราบชื่อ';
}

// GET: ดึงข้อมูลรถยนต์ทั้งหมด
export async function GET() {
  const session = await getServerSession(authOptions);
  // Admin และ Executive สามารถเข้าถึงได้
  if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Executive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(vehicles);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: สร้างข้อมูลรถยนต์ใหม่
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Executive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { licensePlate, brand, color, model, type, capacity, passengerCapacity, currentMileage, vehicleImageUrl } = body;

    if (!licensePlate) {
      return NextResponse.json({ error: 'License plate is required' }, { status: 400 });
    }

    const newVehicle = await prisma.vehicle.create({
      data: {
        licensePlate,
        brand,
        color: color?.trim() || null,
        model,
        type,
        capacity: capacity ? parseInt(capacity, 10) : null,
        passengerCapacity: passengerCapacity !== undefined && passengerCapacity !== '' ? parseInt(passengerCapacity, 10) : null,
        currentMileage: currentMileage ? parseInt(currentMileage, 10) : null,
        vehicleImageUrl: vehicleImageUrl?.trim() || null,
      },
    });

    const actor = actorName(session);
    await writeUsageLog({
      action: 'CREATE',
      path: '/admin/vehicles',
      userId: session.user.id,
      role: session.user.role as Role,
      entityType: 'Vehicle',
      entityId: newVehicle.id,
      message: `${session.user.role === 'Executive' ? 'ผู้บริหาร' : 'แอดมิน'} ${actor} เพิ่มรถยนต์ ${newVehicle.licensePlate}`,
    });

    return NextResponse.json(newVehicle, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
