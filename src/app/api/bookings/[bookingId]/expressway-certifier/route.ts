import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { createNotifications } from '@/lib/notifications';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== 'Admin' && session.user.role !== 'Executive')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const certifierUserId = typeof body?.certifierUserId === 'string' ? body.certifierUserId.trim() : '';
    if (!certifierUserId) {
      return NextResponse.json({ error: 'Missing certifierUserId' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, expresswayOption: true, startTime: true },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    if (booking.expresswayOption !== 'EXPRESSWAY') {
      return NextResponse.json(
        { error: 'Booking is not an expressway trip' },
        { status: 400 }
      );
    }

    const certifier = await prisma.user.findUnique({
      where: { id: certifierUserId },
      select: { id: true, name: true, email: true, isActive: true },
    });
    if (!certifier || certifier.isActive === false) {
      return NextResponse.json({ error: 'Certifier not found or inactive' }, { status: 404 });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        expresswayCertifierId: certifierUserId,
        expresswayCertificationStatus: 'PENDING',
        expresswayCertifiedAt: null,
        expresswayCertifierSignatureUrl: null,
        expresswayCertifierName: null,
        expresswayCertifierPosition: null,
        expresswayCertificationNote: null,
      },
    });

    await createNotifications([
      {
        userId: certifierUserId,
        type: 'EXPRESSWAY_CERTIFICATION_REQUESTED',
        title: 'มีคำขอให้รับรองทางด่วน',
        message: `เลขที่คำขอ: ${bookingId.slice(0, 8)}…`,
        href: `/certifier/certifications/${bookingId}`,
        entityType: 'Booking',
        entityId: bookingId,
        severity: 'INFO',
      },
    ]);

    return NextResponse.json(updated);
  } catch (e) {
    console.error('POST /api/bookings/[bookingId]/expressway-certifier error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

