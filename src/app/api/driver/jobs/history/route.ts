// src/app/api/driver/jobs/history/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET: ดึงข้อมูลประวัติงานที่เสร็จสิ้น, ยกเลิก, หรือถูกปฏิเสธ
export async function GET() {
  const session = await getServerSession(authOptions);
  
  // ตรวจสอบ Session และสิทธิ์การใช้งาน
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ตรวจสอบว่าเป็น Driver หรือไม่
  if (session.user.role !== 'Driver') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // ดึงข้อมูล bookings ที่มี status เป็น COMPLETED, CANCELLED, หรือ REJECTED
    // และถูก assigned ให้ driver ปัจจุบัน
    const history = await prisma.booking.findMany({
      where: {
        driverId: session.user.id,
        status: {
          in: ['COMPLETED', 'CANCELLED', 'REJECTED'],
        },
      },
      include: {
        requester: {
          select: {
            name: true,
            email: true,
            position: true,
          },
        },
        vehicle: {
          select: {
            licensePlate: true,
            brand: true,
            color: true,
            model: true,
            type: true,
          },
        },
        adminApprover: {
          select: {
            name: true,
          },
        },
        executiveConfirmer: {
          select: {
            name: true,
          },
        },
        feedback: {
          select: {
            rating: true,
            comment: true,
          },
        },
        driverFeedback: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            requester: { select: { name: true } },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching driver job history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

