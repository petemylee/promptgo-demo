// src/app/api/driver/jobs/[bookingId]/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeUsageLog } from '@/lib/usageLogs';
import { sendLineMessage } from '@/lib/line';
import { buildBookingNotification } from '@/lib/lineNotifications';
import { createNotifications } from '@/lib/notifications';
import { inboxHrefForUserRole } from '@/lib/inboxHrefForRole';

function actorName(session: Session | null) {
  return session?.user?.name || session?.user?.email || session?.user?.id || 'ไม่ทราบชื่อ';
}

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
      include: {
        requester: {
          select: {
            role: true,
            lineUserId: true,
            name: true,
            position: true,
            phoneNumber: true,
          },
        },
        expresswayCertifier: { select: { id: true } },
        vehicle: {
          select: {
            brand: true,
            model: true,
            color: true,
            licensePlate: true,
            currentMileage: true,
          },
        },
        driver: {
          select: {
            name: true,
            phoneNumber: true,
          },
        },
      },
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
    if (booking.vehicle && booking.vehicle.currentMileage !== null) {
      startMileage = booking.vehicle.currentMileage;
    }

    // อัปเดต booking status เป็น IN_PROGRESS และบันทึกเลขไมล์ก่อนออกเดินทาง
    const startedAt = booking.startTime || new Date();
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'IN_PROGRESS' as BookingStatus,
        startTime: startedAt,
        startMileage: startMileage,
      },
    });

    await writeUsageLog({
      action: 'UPDATE',
      path: '/driver/jobs',
      userId: session.user.id,
      role: 'Driver',
      entityType: 'Booking',
      entityId: bookingId,
      message: `คนขับ ${actorName(session)} เริ่มงาน (เริ่มเดินทาง)`,
    });

    // In-app: แจ้ง requester ว่าคนขับเริ่มงานแล้ว
    try {
      await createNotifications([
        {
          userId: booking.requesterId,
          type: 'BOOKING_STARTED',
          title: 'คนขับเริ่มเดินทางแล้ว',
          message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
          href: inboxHrefForUserRole(booking.requester.role),
          entityType: 'Booking',
          entityId: bookingId,
          severity: 'INFO' as const,
        },
      ]);
    } catch (err) {
      console.error('Failed to create start notifications:', err);
    }

    if (booking.requester?.lineUserId) {
      const startMsg = buildBookingNotification('BOOKING_STARTED_REQUESTER', {
        id: booking.id,
        status: 'IN_PROGRESS',
        purpose: booking.purpose,
        endLocation: booking.endLocation,
        startTime: startedAt,
        endTime: booking.endTime,
        passengerCount: booking.passengerCount,
        requestForSelf: booking.requestForSelf,
        travelerName: booking.travelerName,
        travelerPosition: booking.travelerPosition,
        travelerPhone: booking.travelerPhone,
        requester: {
          name: booking.requester.name,
          position: booking.requester.position,
          phoneNumber: booking.requester.phoneNumber,
        },
        vehicle: booking.vehicle
          ? {
              brand: booking.vehicle.brand,
              model: booking.vehicle.model,
              color: booking.vehicle.color,
              licensePlate: booking.vehicle.licensePlate,
            }
          : null,
        driver: booking.driver
          ? {
              name: booking.driver.name,
              phoneNumber: booking.driver.phoneNumber,
            }
          : null,
      });

      sendLineMessage(booking.requester.lineUserId, startMsg).catch((e) =>
        console.error('LINE notify requester on start job:', e)
      );
    }

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Error starting job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

