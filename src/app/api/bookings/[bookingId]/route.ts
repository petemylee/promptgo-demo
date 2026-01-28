import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { BookingStatus, TripType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
            phoneNumber: true,
            profileImageUrl: true,
          }
        },
        adminApprover: {
          select: {
            name: true,
            phoneNumber: true,
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
            vehicleImageUrl: true,
          }
        },
        driver: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            profileImageUrl: true,
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
    const { 
      status, 
      executiveConfirmerId, 
      signatureImageUrl, 
      vehicleId, 
      driverId, 
      requesterSignatureUrl,
      endLocation,
      purpose,
      startTime,
      endTime,
      passengerCount,
      tripType,
      passengerImageUrl
    } = body;

    // ตรวจสอบสิทธิ์ตาม role
    // Requester สามารถแก้ไขคำขอได้ (เฉพาะ PENDING status) หรืออัปเดตลายเซ็น
    if (session.user.role === 'Requester') {
      // ตรวจสอบว่า booking เป็นของ requester คนนี้หรือไม่
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { requesterId: true, status: true },
      });

      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      if (booking.requesterId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized to update this booking' }, { status: 403 });
      }

      // ถ้าเป็นการแก้ไขข้อมูล (ไม่ใช่แค่ลายเซ็น)
      if (endLocation !== undefined || purpose !== undefined || startTime !== undefined || 
          endTime !== undefined || passengerCount !== undefined || tripType !== undefined || 
          passengerImageUrl !== undefined) {
        // ตรวจสอบว่า status เป็น PENDING เท่านั้น
        if (booking.status !== 'PENDING') {
          return NextResponse.json({ 
            error: 'สามารถแก้ไขได้เฉพาะคำขอที่อยู่ในสถานะ PENDING เท่านั้น' 
          }, { status: 400 });
        }

        // อัปเดตข้อมูลการจอง
        const updateData: {
          endLocation?: string;
          purpose?: string;
          startTime?: Date | null;
          endTime?: Date | null;
          passengerCount?: number | null;
          tripType?: TripType | null;
          passengerImageUrl?: string | null;
          requesterSignatureUrl?: string | null;
        } = {};
        if (endLocation !== undefined) updateData.endLocation = endLocation;
        if (purpose !== undefined) updateData.purpose = purpose;
        if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null;
        if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
        if (passengerCount !== undefined) {
          updateData.passengerCount = typeof passengerCount === 'number' 
            ? passengerCount 
            : passengerCount ? parseInt(passengerCount.toString(), 10) : null;
        }
        if (tripType !== undefined) updateData.tripType = tripType || null;
        if (passengerImageUrl !== undefined) updateData.passengerImageUrl = passengerImageUrl || null;
        if (requesterSignatureUrl !== undefined) updateData.requesterSignatureUrl = requesterSignatureUrl || null;

        const updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: updateData,
        });

        return NextResponse.json(updatedBooking);
      } else if (requesterSignatureUrl !== undefined) {
        // อัปเดตเฉพาะลายเซ็น (สามารถทำได้ทุกสถานะ)
        const updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            requesterSignatureUrl: requesterSignatureUrl || null,
          },
        });

        return NextResponse.json(updatedBooking);
      } else {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }
    } else if (session.user.role === 'Admin') {
      // Admin สามารถอนุมัติเบื้องต้นได้
      if (status !== 'APPROVED' && status !== 'REJECTED') {
        return NextResponse.json({ error: 'Invalid status for Admin' }, { status: 400 });
      }

      // ตรวจสอบว่า vehicleId มีอยู่จริง (ถ้ามีการส่งมา)
      if (status === 'APPROVED' && vehicleId) {
        const vehicle = await prisma.vehicle.findUnique({
          where: { id: vehicleId },
        });
        if (!vehicle) {
          return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }
      }

      // ตรวจสอบว่า driverId มีอยู่จริง (ถ้ามีการส่งมา)
      if (status === 'APPROVED' && driverId) {
        const driver = await prisma.user.findUnique({
          where: { id: driverId },
        });
        if (!driver) {
          return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }
        if (driver.role !== 'Driver') {
          return NextResponse.json({ error: 'Selected user is not a driver' }, { status: 400 });
        }
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: status as BookingStatus,
          adminApproverId: session.user.id,
          ...(status === 'APPROVED' && vehicleId ? { vehicleId } : {}),
          ...(status === 'APPROVED' && driverId ? { driverId } : {}),
        },
      });

      return NextResponse.json(updatedBooking);
    } else if (session.user.role === 'Executive') {
      // Executive สามารถยืนยันขั้นสุดท้ายได้
      if (status !== 'CONFIRMED') {
        return NextResponse.json({ error: 'Invalid status for Executive' }, { status: 400 });
      }

      // Executive ต้องเลือกรถยนต์และคนขับ (บังคับ)
      if (!vehicleId) {
        return NextResponse.json({ error: 'Vehicle selection is required for confirmation' }, { status: 400 });
      }

      if (!driverId) {
        return NextResponse.json({ error: 'Driver selection is required for confirmation' }, { status: 400 });
      }

      // ตรวจสอบว่า vehicleId มีอยู่จริง
        const vehicle = await prisma.vehicle.findUnique({
          where: { id: vehicleId },
        });
        if (!vehicle) {
          return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }

      // ตรวจสอบว่า driverId มีอยู่จริง
        const driver = await prisma.user.findUnique({
          where: { id: driverId },
        });
        if (!driver) {
          return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }
        if (driver.role !== 'Driver') {
          return NextResponse.json({ error: 'Selected user is not a driver' }, { status: 400 });
      }

      // อัปเดต booking status
      const updateData: {
        status: BookingStatus;
        executiveConfirmerId: string;
        vehicleId: string;
        driverId: string;
        executiveConfirmedAt: Date;
      } = {
        status: BookingStatus.CONFIRMED,
        executiveConfirmerId: executiveConfirmerId || session.user.id,
        vehicleId: vehicleId,
        driverId: driverId,
        executiveConfirmedAt: new Date(), // ตั้งค่าวันที่ Executive ยืนยัน
      };

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

// DELETE: ลบการจอง
export async function DELETE(
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
    // ตรวจสอบว่า booking เป็นของ requester คนนี้หรือไม่
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { requesterId: true, status: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Requester สามารถลบได้เฉพาะคำขอที่อยู่ในสถานะ PENDING
    if (session.user.role === 'Requester') {
      if (booking.requesterId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized to delete this booking' }, { status: 403 });
      }

      if (booking.status !== 'PENDING') {
        return NextResponse.json({ 
          error: 'สามารถลบได้เฉพาะคำขอที่อยู่ในสถานะ PENDING เท่านั้น' 
        }, { status: 400 });
      }

      await prisma.booking.delete({
        where: { id: bookingId },
      });

      return NextResponse.json({ message: 'Booking deleted successfully' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
