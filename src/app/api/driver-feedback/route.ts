// src/app/api/driver-feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET: ดึงข้อเสนอแนะคนขับ
// - Driver: เห็นเฉพาะของตัวเอง
// - Admin, Executive: ส่ง ?driverId= เพื่อดูข้อเสนอแนะของคนขับคนนั้น หรือไม่ส่ง = ดึงทั้งหมด
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'ยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
  }

  const role = session.user.role;
  const driverIdParam = req.nextUrl.searchParams.get('driverId');

  try {
    if (role === 'Driver') {
      // คนขับเห็นเฉพาะข้อเสนอแนะของตัวเอง
      const feedbacks = await prisma.driverFeedback.findMany({
        where: { driverId: session.user.id },
        include: {
          requester: { select: { name: true } },
          booking: {
            select: {
              id: true,
              purpose: true,
              endLocation: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(feedbacks);
    }

    if (role === 'Admin' || role === 'Executive') {
      const where = driverIdParam ? { driverId: driverIdParam } : {};
      const feedbacks = await prisma.driverFeedback.findMany({
        where,
        include: {
          driver: { select: { id: true, name: true, email: true } },
          requester: { select: { name: true } },
          booking: {
            select: {
              id: true,
              purpose: true,
              endLocation: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(feedbacks);
    }

    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  } catch (error) {
    console.error('Error fetching driver feedback:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดของระบบ' }, { status: 500 });
  }
}

// POST: ผู้ขอใช้รถ (requester ของการจอง) สร้างข้อเสนอแนะให้คนขับ - รองรับทุก role ที่เป็นผู้ขอการจอง
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'ยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { driverId, bookingId, rating, comment } = body;

    if (!driverId || !bookingId || typeof rating !== 'number') {
      return NextResponse.json(
        { error: 'driverId, bookingId และ rating (1-5) จำเป็น' },
        { status: 400 }
      );
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating ต้องอยู่ระหว่าง 1-5' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า booking เป็นของ requester นี้ มี driver และ status เป็น COMPLETED
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { requesterId: true, driverId: true, status: true },
    });
    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });
    }
    if (booking.requesterId !== session.user.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ให้ข้อเสนอแนะสำหรับการจองนี้' }, { status: 403 });
    }
    if (booking.driverId !== driverId) {
      return NextResponse.json({ error: 'การจองนี้ไม่ได้กำหนดคนขับนี้' }, { status: 400 });
    }
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'ให้ข้อเสนอแนะได้เฉพาะการจองที่เสร็จสิ้นแล้ว' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ายังไม่มีข้อเสนอแนะสำหรับ booking นี้
    const existing = await prisma.driverFeedback.findUnique({
      where: { bookingId },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'มีการให้ข้อเสนอแนะสำหรับการจองนี้แล้ว' },
        { status: 400 }
      );
    }

    const feedback = await prisma.driverFeedback.create({
      data: {
        driverId,
        requesterId: session.user.id,
        bookingId,
        rating,
        comment: comment?.trim() || null,
      },
      include: {
        driver: { select: { name: true } },
        requester: { select: { name: true } },
      },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error creating driver feedback:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
