// src/app/api/driver/jobs/[bookingId]/end/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeUsageLog } from '@/lib/usageLogs';

function actorName(session: any) {
  return session?.user?.name || session?.user?.email || session?.user?.id || 'ไม่ทราบชื่อ';
}

// PATCH: สิ้นสุดงาน (อัปเดต status เป็น COMPLETED)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params;
  const session = await getServerSession(authOptions);

  // ตรวจสอบ Session และสิทธิ์การใช้งาน
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ตรวจสอบว่าเป็น Driver หรือไม่
  if (session.user.role !== 'Driver') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ตรวจสอบ bookingId
  if (!bookingId || bookingId.trim() === '') {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }

  try {
    // ดึงข้อมูล endMileage จาก request body
    const body = await req.json();
    const { endMileage } = body;

    // ตรวจสอบว่า endMileage ถูกส่งมาหรือไม่
    if (!endMileage || typeof endMileage !== 'number' || endMileage < 0) {
      return NextResponse.json(
        { error: 'endMileage is required and must be a positive number' },
        { status: 400 }
      );
    }

    // ดึงข้อมูล booking พร้อม vehicle
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // ตรวจสอบว่า booking ถูก assigned ให้ driver ปัจจุบันหรือไม่
    if (booking.driverId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: Booking not assigned to you' }, { status: 403 });
    }

    // ตรวจสอบว่า booking status เป็น IN_PROGRESS หรือไม่
    if (booking.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Booking must be IN_PROGRESS to end' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า endMileage ต้องมากกว่าหรือเท่ากับ startMileage
    if (booking.startMileage !== null && endMileage < booking.startMileage) {
      return NextResponse.json(
        { error: 'End mileage must be greater than or equal to start mileage' },
        { status: 400 }
      );
    }

    // คำนวณระยะทางที่ใช้ไป
    const distanceTraveled = booking.startMileage !== null 
      ? endMileage - booking.startMileage 
      : null;

    // อัปเดต booking status เป็น COMPLETED และบันทึกเลขไมล์หลังเดินทาง
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'COMPLETED' as BookingStatus,
        endTime: new Date(),
        endMileage: endMileage,
      },
    });

    // อัปเดตเลขไมล์ปัจจุบันของ vehicle
    if (booking.vehicleId && booking.vehicle) {
      await prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: {
          currentMileage: endMileage,
        },
      });
    }

    await writeUsageLog({
      action: 'UPDATE',
      path: '/driver/jobs',
      userId: session.user.id,
      role: 'Driver',
      entityType: 'Booking',
      entityId: bookingId,
      message: `คนขับ ${actorName(session)} จบงาน (เลขไมล์สิ้นสุด: ${endMileage})`,
    });

    return NextResponse.json({
      ...updatedBooking,
      distanceTraveled,
    });
  } catch (error) {
    console.error('Error ending job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

