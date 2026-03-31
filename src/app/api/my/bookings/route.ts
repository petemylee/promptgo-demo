import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: { requesterId: session.user.id },
      orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        purpose: true,
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
          }
        },
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
            type: true,
          }
        },
        driverFeedback: {
          select: {
            id: true,
            rating: true,
            comment: true,
          }
        }
      }
    });

    // Map bookings to include startLocation as null (since it's not in schema)
    const bookingsWithStartLocation = bookings.map(booking => ({
      ...booking,
      startLocation: null, // startLocation was removed from schema
    }));

    return NextResponse.json(bookingsWithStartLocation);
  } catch (err) {
    console.error('GET /api/my/bookings error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


