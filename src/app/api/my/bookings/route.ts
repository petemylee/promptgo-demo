import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: { requesterId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        purpose: true,
        endLocation: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


