import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import type { ExpresswayCertificationStatus } from '@prisma/client';

const CERT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const satisfies readonly ExpresswayCertificationStatus[];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const statusFilter =
      status != null && (CERT_STATUSES as readonly string[]).includes(status)
        ? { expresswayCertificationStatus: status as ExpresswayCertificationStatus }
        : {};

    const bookings = await prisma.booking.findMany({
      where: {
        expresswayCertifierId: session.user.id,
        ...statusFilter,
      },
      select: {
        id: true,
        status: true,
        expresswayOption: true,
        expresswayCertificationStatus: true,
        expresswayCertifiedAt: true,
        startTime: true,
        endTime: true,
        endLocation: true,
        purpose: true,
        createdAt: true,
        requester: { select: { name: true, position: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json(bookings);
  } catch (e) {
    console.error('GET /api/certifier/expressway-certifications error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

