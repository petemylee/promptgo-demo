import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ฟังก์ชันสำหรับจัดการ Request แบบ PATCH (ใช้สำหรับการอัปเดตข้อมูลบางส่วน)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  // ✅ ต้อง await context.params
  const { bookingId } = await context.params;

  // ตรวจสอบ Session และสิทธิ์
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { status } = await req.json();

    // ตรวจสอบว่า status ที่ส่งมาถูกต้อง
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // อัปเดตสถานะในฐานข้อมูล
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: status as BookingStatus,
        adminApproverId: session.user.id, // บันทึกว่าใครเป็นคนอนุมัติ
      },
    });

    return NextResponse.json(updatedBooking, { status: 200 });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
