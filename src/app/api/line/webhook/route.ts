import { NextRequest, NextResponse } from 'next/server';
import { validateSignature } from '@line/bot-sdk';
import type { WebhookEvent, WebhookRequestBody } from '@line/bot-sdk';
import { prisma } from '@/lib/prisma';
import { replyLineTextChain } from '@/lib/line';
import {
  buildLineBookingMessages,
  LINE_POSTBACK_TRACK_MY_BOOKINGS,
} from '@/lib/lineBookingSummary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LINK_HELP_TH =
  'ยังไม่ได้เชื่อมบัญชี LINE กับระบบ\n\nกรุณาเข้าเว็บ OFM PROMPTGO ล็อกอิน แล้วใช้เมนู "เชื่อมต่อ LINE" ในโปรไฟล์';

function getPublicBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return '';
}

function getLineUserIdFromEvent(event: WebhookEvent): string | null {
  if (event.source.type !== 'user') return null;
  return event.source.userId;
}

async function sendRequesterBookingsReply(lineUserId: string, replyToken: string) {
  const user = await prisma.user.findUnique({
    where: { lineUserId },
    select: { id: true },
  });

  if (!user) {
    await replyLineTextChain(replyToken, lineUserId, [LINK_HELP_TH]);
    return;
  }

  const bookings = await prisma.booking.findMany({
    where: {
      requesterId: user.id,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      purpose: true,
      endLocation: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
      requestForSelf: true,
      travelerName: true,
      travelerPhone: true,
      passengerCount: true,
      requester: {
        select: { name: true, phoneNumber: true },
      },
      driver: {
        select: { name: true, email: true, phoneNumber: true },
      },
      vehicle: {
        select: {
          licensePlate: true,
          brand: true,
          model: true,
          color: true,
          type: true,
        },
      },
    },
  });

  const messages = buildLineBookingMessages(bookings, getPublicBaseUrl());
  await replyLineTextChain(replyToken, lineUserId, messages);
}

function shouldHandleTrackBookings(event: WebhookEvent): boolean {
  if (event.type === 'postback') {
    return event.postback.data === LINE_POSTBACK_TRACK_MY_BOOKINGS;
  }
  if (event.type === 'message' && event.message.type === 'text') {
    const t = event.message.text.trim();
    return t === 'สถานะการจอง' || t === 'รายการจอง';
  }
  return false;
}

/**
 * LINE Messaging API Webhook — รับ postback จาก Rich Menu (`data`: `track_my_bookings`)
 * แล้วตอบรายการจองในฐานะผู้ขอใช้รถ (ยกเว้นสถานะเสร็จสิ้นและยกเลิก)
 *
 * ตั้งค่าใน LINE Developers: Webhook URL = `https://<โดเมน>/api/line/webhook`
 * Rich Menu ปุ่มนี้ต้องเป็น action แบบ **postback** ไม่ใช่ URI
 */
export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
  if (!channelSecret) {
    return NextResponse.json({ message: 'LINE_CHANNEL_SECRET not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature');
  if (!signature || !validateSignature(rawBody, channelSecret, signature)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  let body: WebhookRequestBody;
  try {
    body = JSON.parse(rawBody) as WebhookRequestBody;
  } catch {
    return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
  }

  for (const event of body.events) {
    if (!shouldHandleTrackBookings(event)) continue;
    if (!('replyToken' in event)) continue;

    const lineUserId = getLineUserIdFromEvent(event);
    if (!lineUserId) continue;

    try {
      await sendRequesterBookingsReply(lineUserId, event.replyToken);
    } catch (e) {
      console.error('LINE webhook handleTrackBookings:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
