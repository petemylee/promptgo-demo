// src/app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  // 1. ตรวจสอบ Session และสิทธิ์การใช้งาน
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. ดึงข้อมูลจาก Frontend
    const body = await req.json();
    const { endLocation, purpose, startTime } = body;

    // 3. ตรวจสอบข้อมูลเบื้องต้น
    if (!endLocation || !purpose || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 4. สร้างข้อมูลการจองใหม่ในฐานข้อมูล
    const newBooking = await prisma.booking.create({
      data: {
        endLocation,
        purpose,
        startTime: new Date(startTime),
        status: 'PENDING', // กำหนดสถานะเริ่มต้น
        requesterId: session.user.id, // เชื่อมโยงกับผู้ใช้ที่ Login อยู่
      },
    });

    // 5. ส่งข้อมูลที่สร้างสำเร็จกลับไป
    return NextResponse.json(newBooking, { status: 201 });

  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ========== เพิ่มฟังก์ชันนี้เข้าไปใหม่ ==========
export async function GET() {
  // ตรวจสอบ Session และสิทธิ์ (ควรเช็คว่าเป็น Admin)
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ดึงข้อมูลการจองทั้งหมดที่มีสถานะ PENDING
    const pendingBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        requester: { // ดึงข้อมูลผู้ขอใช้ที่เกี่ยวข้องมาด้วย
          select: {
            name: true, // เลือกมาแค่ชื่อ
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // เรียงตามเวลาที่สร้างก่อน-หลัง
      },
    });

    return NextResponse.json(pendingBookings, { status: 200 });

  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}