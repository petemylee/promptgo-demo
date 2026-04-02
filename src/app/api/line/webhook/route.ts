import { NextRequest, NextResponse } from 'next/server';
import { validateSignature } from '@line/bot-sdk';
import type { WebhookEvent, WebhookRequestBody } from '@line/bot-sdk';
import { prisma } from '@/lib/prisma';
import { replyLineTextChain, sendLineMessage } from '@/lib/line';
import {
  buildLineBookingMessages,
  LINE_POSTBACK_TRACK_MY_BOOKINGS,
} from '@/lib/lineBookingSummary';
import {
  LINE_POSTBACK_CONTACT_STAFF,
  LINE_TEXT_CONTACT_STAFF,
} from '@/lib/lineRichMenuTriggers';
import { formatBangkokDateTime } from '@/lib/dateTime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LINK_HELP_TH =
  'ยังไม่ได้เชื่อมบัญชี LINE กับระบบ\n\nกรุณาเข้าเว็บ OFM PROMPTGO ล็อกอิน แล้วใช้เมนู "เชื่อมต่อ LINE" ในโปรไฟล์';

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
      status: { notIn: ['COMPLETED', 'CANCELLED', 'REJECTED'] },
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

  const messages = buildLineBookingMessages(bookings);
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

function shouldHandleContactStaff(event: WebhookEvent): boolean {
  if (event.type === 'postback') {
    return event.postback.data === LINE_POSTBACK_CONTACT_STAFF;
  }
  if (event.type === 'message' && event.message.type === 'text') {
    return event.message.text.trim() === LINE_TEXT_CONTACT_STAFF;
  }
  return false;
}

async function notifyAdminsContactStaff(lineUserId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { lineUserId },
    select: { name: true, email: true, phoneNumber: true, position: true },
  });

  const adminsWithLine = await prisma.user.findMany({
    where: {
      role: { in: ['Admin', 'Executive'] },
      lineUserId: { not: null },
    },
    select: { lineUserId: true },
  });
  const adminLineIds = adminsWithLine
    .map((u) => u.lineUserId)
    .filter((id): id is string => !!id);

  const when = formatBangkokDateTime(new Date());

  const whoLines = user
    ? [
        `ชื่อ: ${user.name || '-'}`,
        `ตำแหน่ง: ${user.position || '-'}`,
        `อีเมล: ${user.email}`,
        user.phoneNumber ? `เบอร์: ${user.phoneNumber}` : null,
      ].filter((x): x is string => !!x)
    : ['สถานะบัญชี: ยังไม่เชื่อมกับระบบ OFM PROMPTGO (ไม่ทราบชื่อในระบบ)'];

  const adminMsg = [
    '🔔 มีผู้ใช้กดขอ "ติดต่อเจ้าหน้าที่" จาก LINE',
    `เวลา: ${when}`,
    '',
    ...whoLines,
    '',
    'กรุณาเปิดแชต Official Account แล้วตอบกลับผู้ใช้ด้วยตนเอง',
  ].join('\n');

  if (adminLineIds.length === 0) {
    console.warn('LINE contact_staff: no Admin/Executive with lineUserId');
    return false;
  }

  const results = await Promise.all(
    adminLineIds.map((id) => sendLineMessage(id, adminMsg))
  );
  return results.some(Boolean);
}

async function handleContactStaff(lineUserId: string, replyToken: string) {
  const notified = await notifyAdminsContactStaff(lineUserId);

  const userReply = notified
    ? [
        'เรียบร้อยครับ เจ้าหน้าที่ได้รับแจ้งเตือนแล้ว และจะตอบกลับในแชตนี้โดยเร็วที่สุด',
        'หากเร่งด่วน สามารถติดต่อหน่วยงานตามช่องทางที่สำนักกำหนดได้ครับ',
      ]
    : [
        'ขออภัยครับ ระบบแจ้งเจ้าหน้าที่ไม่สำเร็จชั่วคราว กรุณาลองใหม่ภายหลัง หรือติดต่อหน่วยงานทางโทรศัพท์ครับ',
      ];

  await replyLineTextChain(replyToken, lineUserId, userReply);
}

/**
 * LINE Messaging API Webhook
 * - สถานะการจอง: ข้อความ `สถานะการจอง` หรือ postback `track_my_bookings`
 * - ติดต่อเจ้าหน้าที่: ข้อความ `ติดต่อเจ้าหน้าที่` หรือ postback `contact_staff` → แจ้ง Admin/Executive ที่ผูก LINE
 *
 * Webhook URL: `https://<โดเมน>/api/line/webhook`
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
    if (!('replyToken' in event)) continue;

    const lineUserId = getLineUserIdFromEvent(event);
    if (!lineUserId) continue;

    try {
      if (shouldHandleTrackBookings(event)) {
        await sendRequesterBookingsReply(lineUserId, event.replyToken);
      } else if (shouldHandleContactStaff(event)) {
        await handleContactStaff(lineUserId, event.replyToken);
      }
    } catch (e) {
      console.error('LINE webhook event:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
