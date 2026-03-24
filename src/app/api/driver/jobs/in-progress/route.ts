// src/app/api/driver/jobs/in-progress/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET: ดึงข้อมูลงานที่กำลังทำอยู่ (IN_PROGRESS bookings)
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
    // ดึงข้อมูล IN_PROGRESS bookings ที่ assigned ให้ driver ปัจจุบัน
    const jobs = await prisma.booking.findMany({
      where: {
        driverId: session.user.id,
        status: 'IN_PROGRESS',
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
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching in-progress jobs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

