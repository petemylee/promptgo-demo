// src/app/api/vehicles/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

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
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { licensePlate, brand, model, type, capacity } = body;

    if (!licensePlate) {
      return NextResponse.json({ error: 'License plate is required' }, { status: 400 });
    }

    const newVehicle = await prisma.vehicle.create({
      data: {
        licensePlate,
        brand,
        model,
        type,
        capacity: capacity ? parseInt(capacity, 10) : null,
      },
    });

    return NextResponse.json(newVehicle, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}