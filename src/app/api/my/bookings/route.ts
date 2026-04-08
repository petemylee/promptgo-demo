import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // My Bookings: แสดงเฉพาะรายการที่ "ผู้ใช้นี้เป็นผู้ขอใช้ (requester)" ไม่ว่าผู้ใช้จะอยู่ role ใด
  // (เช่น Admin/Executive ก็มีเมนู My bookings ของตัวเองได้ แต่ต้องไม่เห็นของคนอื่น)

  try {
    const bookings = await prisma.booking.findMany({
      where: { requesterId: session.user.id },
      orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        purpose: true,
        startLocation: true,
        endLocation: true,
        startTime: true,
        endTime: true,
        status: true,
        rejectionReason: true,
        rejectedAt: true,
        createdAt: true,
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImageUrl: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
            type: true,
            vehicleImageUrl: true,
          },
        },
        driverFeedback: {
          select: {
            id: true,
            rating: true,
            comment: true,
          },
        },
      },
    });
    return NextResponse.json(bookings);
  } catch (err) {
    console.error('GET /api/my/bookings error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

