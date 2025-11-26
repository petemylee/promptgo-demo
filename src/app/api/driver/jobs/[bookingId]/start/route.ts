// src/app/api/driver/jobs/[bookingId]/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// PATCH: เริ่มงาน (อัปเดต status เป็น IN_PROGRESS)
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
    // ดึงข้อมูล booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // ตรวจสอบว่า booking ถูก assigned ให้ driver ปัจจุบันหรือไม่
    if (booking.driverId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: Booking not assigned to you' }, { status: 403 });
    }

    // ตรวจสอบว่า booking status เป็น CONFIRMED หรือไม่
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Booking must be CONFIRMED to start' },
        { status: 400 }
      );
    }

    // ดึงข้อมูล vehicle เพื่อบันทึกเลขไมล์ก่อนออกเดินทาง
    let startMileage: number | null = null;
    if (booking.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: booking.vehicleId },
      });
      if (vehicle && vehicle.currentMileage !== null) {
        startMileage = vehicle.currentMileage;
      }
    }

    // อัปเดต booking status เป็น IN_PROGRESS และบันทึกเลขไมล์ก่อนออกเดินทาง
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'IN_PROGRESS' as BookingStatus,
        startTime: booking.startTime || new Date(),
        startMileage: startMileage,
      },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Error starting job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

