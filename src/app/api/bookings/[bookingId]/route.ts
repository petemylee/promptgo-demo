import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

// GET: ดึงข้อมูลการจองตาม ID
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params;

  // ตรวจสอบ Session
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        requester: {
          select: {
            name: true,
            email: true,
            position: true,
          }
        },
        adminApprover: {
          select: {
            name: true,
          }
        },
        executiveConfirmer: {
          select: {
            name: true,
            signatureImageUrl: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
          }
        },
        driver: {
          select: {
            name: true,
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: อัปเดตข้อมูลการจอง
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params;

  // ตรวจสอบ Session
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { status, executiveConfirmerId, signatureImageUrl, vehicleId } = body;

    // ตรวจสอบสิทธิ์ตาม role
    if (session.user.role === 'Admin') {
      // Admin สามารถอนุมัติเบื้องต้นได้
      if (status !== 'APPROVED' && status !== 'REJECTED') {
        return NextResponse.json({ error: 'Invalid status for Admin' }, { status: 400 });
      }

      // ถ้าอนุมัติ ต้องมี vehicleId
      if (status === 'APPROVED' && !vehicleId) {
        return NextResponse.json({ error: 'Vehicle selection is required when approving' }, { status: 400 });
      }

      // ตรวจสอบว่า vehicleId มีอยู่จริง
      if (status === 'APPROVED' && vehicleId) {
        const vehicle = await prisma.vehicle.findUnique({
          where: { id: vehicleId },
        });
        if (!vehicle) {
          return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: status as BookingStatus,
          adminApproverId: session.user.id,
          ...(status === 'APPROVED' && vehicleId ? { vehicleId } : {}),
        },
      });

      return NextResponse.json(updatedBooking);
    } else if (session.user.role === 'Executive') {
      // Executive สามารถยืนยันขั้นสุดท้ายได้
      if (status !== 'CONFIRMED') {
        return NextResponse.json({ error: 'Invalid status for Executive' }, { status: 400 });
      }

      // ตรวจสอบว่า vehicleId มีอยู่จริง (ถ้ามีการส่งมา)
      if (vehicleId) {
        const vehicle = await prisma.vehicle.findUnique({
          where: { id: vehicleId },
        });
        if (!vehicle) {
          return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }
      }

      // อัปเดต booking status
      const updateData: any = {
        status: 'CONFIRMED' as BookingStatus,
        executiveConfirmerId: executiveConfirmerId || session.user.id,
      };

      // ถ้ามี vehicleId ส่งมา ให้อัปเดตรถยนต์ (Executive สามารถแก้ไขหรือคงเดิม)
      if (vehicleId) {
        updateData.vehicleId = vehicleId;
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: updateData,
      });

      // อัปเดต signature URL ใน user profile
      if (signatureImageUrl) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            signatureImageUrl: signatureImageUrl,
          },
        });
      }

      return NextResponse.json(updatedBooking);
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
