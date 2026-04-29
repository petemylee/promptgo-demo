import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { uploadSignature } from '@/lib/supabase-storage';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  type CertifyBody = {
    action?: string;
    note?: string;
    signatureMode?: string;
    signatureDataUrl?: string;
  };

  try {
    const body = (await req.json().catch(() => ({}))) as CertifyBody;
    const action = body.action;
    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        expresswayOption: true,
        expresswayCertifierId: true,
      },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.expresswayOption !== 'EXPRESSWAY') {
      return NextResponse.json({ error: 'Not an expressway booking' }, { status: 400 });
    }
    if (booking.expresswayCertifierId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, position: true, signatureImageUrl: true },
    });
    if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (action === 'REJECT') {
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          expresswayCertificationStatus: 'REJECTED',
          expresswayCertifiedAt: null,
          expresswayCertifierSignatureUrl: null,
          expresswayCertifierName: null,
          expresswayCertifierPosition: null,
          expresswayCertificationNote: note || null,
        },
      });
      return NextResponse.json(updated);
    }

    const signatureMode = body.signatureMode;
    if (signatureMode !== 'PROFILE' && signatureMode !== 'NEW') {
      return NextResponse.json({ error: 'Invalid signatureMode' }, { status: 400 });
    }

    let signatureUrl: string | null = null;
    if (signatureMode === 'PROFILE') {
      signatureUrl = me.signatureImageUrl?.trim() || null;
      if (!signatureUrl) {
        return NextResponse.json({ error: 'โปรไฟล์ยังไม่มีลายเซ็น' }, { status: 400 });
      }
    } else {
      const dataUrl = typeof body.signatureDataUrl === 'string' ? body.signatureDataUrl : '';
      if (!dataUrl.startsWith('data:')) {
        return NextResponse.json({ error: 'Missing signatureDataUrl' }, { status: 400 });
      }
      const res = await fetch(dataUrl);
      const contentType = res.headers.get('content-type') || 'image/png';
      const blob = await res.blob();
      signatureUrl = await uploadSignature(me.id, blob, contentType);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        expresswayCertificationStatus: 'APPROVED',
        expresswayCertifiedAt: new Date(),
        expresswayCertifierSignatureUrl: signatureUrl,
        expresswayCertifierName: me.name || null,
        expresswayCertifierPosition: me.position || null,
        expresswayCertificationNote: null,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('POST /api/bookings/[bookingId]/expressway-certify error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

