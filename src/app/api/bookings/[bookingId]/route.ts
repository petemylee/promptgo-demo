// src/app/api/bookings/[bookingId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ฟังก์ชันสำหรับจัดการ Request แบบ PATCH (ใช้สำหรับการอัปเดตข้อมูลบางส่วน)
export async function PATCH(
  req: Request,
  { params }: { params: { bookingId: string } }
) {
  // ตรวจสอบ Session และสิทธิ์
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bookingId } = params;
    const { status } = await req.json();

    // ตรวจสอบว่า status ที่ส่งมาถูกต้อง
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // อัปเดตสถานะในฐานข้อมูล
    const updatedBooking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: status,
        adminApproverId: session.user.id, // บันทึกว่าใครเป็นคนอนุมัติ
      },
    });

    return NextResponse.json(updatedBooking, { status: 200 });

  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}