import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { BookingStatus, TripType, type Role, type ExpresswayOption } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendLineMessage } from '@/lib/line';
import { writeUsageLog } from '@/lib/usageLogs';
import { buildBookingNotification } from '@/lib/lineNotifications';
import { parseMaybeDateInput, isBeforeBangkokStartOfToday } from '@/lib/dateTime';
import { createNotifications } from '@/lib/notifications';
import { inboxHrefForUserRole } from '@/lib/inboxHrefForRole';
import { requesterMayCancelBooking, requesterMayEditBookingDetails } from '@/lib/bookingRequesterWorkflow';

function actorName(session: Session | null) {
  return session?.user?.name || session?.user?.email || session?.user?.id || 'ไม่ทราบชื่อ';
}

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
    const bookingForAuth = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { requesterId: true, driverId: true },
    });

    if (!bookingForAuth) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const role = session.user.role;
    const isAdminOrExec = role === 'Admin' || role === 'Executive';
    const isRequester = role === 'Requester' && bookingForAuth.requesterId === session.user.id;
    const isDriver = role === 'Driver' && bookingForAuth.driverId === session.user.id;

    if (!isAdminOrExec && !isRequester && !isDriver) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        // expose rejectionReason to requester/admin UIs (non-sensitive)
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
            color: true,
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
      saveExecutiveSignatureToProfile,
      vehicleId, 
      driverId, 
      rejectionReason,
      requesterSignatureUrl,
      startLocation,
      endLocation,
      purpose,
      startTime,
      endTime,
      passengerCount,
      tripType,
      additionalNotes,
      expresswayOption,
    } = body;

    // ดึง booking เพื่อตรวจสอบสิทธิ์
    const bookingForAuth = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { requesterId: true, status: true, startTime: true, endTime: true },
    });
    if (!bookingForAuth) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    // ถ้า Admin/Executive กำลังอนุมัติ/ปฏิเสธ ให้ใช้ flow อนุมัติเสมอ (แม้จะเป็นผู้สร้างคำขอเอง)
    const isAdminApprovalRequest =
      (session.user.role === 'Admin' || session.user.role === 'Executive') &&
      (status === 'APPROVED' || status === 'REJECTED');
    const isRequesterOfBooking = bookingForAuth.requesterId === session.user.id;

    if (isRequesterOfBooking && !isAdminApprovalRequest) {
      // ผู้ขอใช้รถสามารถยกเลิกคำขอได้ตลอดช่วงที่ยังดำเนินการ
      if (status === 'CANCELLED') {
        if (!requesterMayCancelBooking(bookingForAuth.status)) {
          return NextResponse.json(
            { error: 'ไม่สามารถยกเลิกคำขอที่อยู่ในสถานะนี้ได้' },
            { status: 400 }
          );
        }
        const updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CANCELLED' as BookingStatus },
        });

        await writeUsageLog({
          action: 'UPDATE',
          path: '/my-bookings',
          userId: session.user.id,
          role: session.user.role as Role,
          entityType: 'Booking',
          entityId: bookingId,
          message: `ผู้ใช้ ${actorName(session)} ยกเลิกคำขอจองรถ`,
        });

        // In-app: แจ้ง Admin/Executive + Driver (ถ้ามี) ว่าถูกยกเลิก
        try {
          const recipients = await prisma.user.findMany({
            where: { role: { in: ['Admin', 'Executive'] } },
            select: { id: true },
          });
          await createNotifications([
            ...recipients.map((u) => ({
              userId: u.id,
              type: 'BOOKING_CANCELLED',
              title: 'คำขอถูกยกเลิก',
              message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
              href: '/admin/history',
              entityType: 'Booking',
              entityId: bookingId,
              severity: 'WARNING' as const,
            })),
            ...(updatedBooking.driverId
              ? [
                  {
                    userId: updatedBooking.driverId,
                    type: 'BOOKING_CANCELLED',
                    title: 'งานถูกยกเลิก',
                    message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
                    href: `/driver`,
                    entityType: 'Booking',
                    entityId: bookingId,
                    severity: 'WARNING' as const,
                  },
                ]
              : []),
          ]);
        } catch (err) {
          console.error('Failed to create cancellation notifications:', err);
        }
        return NextResponse.json(updatedBooking);
      }

      // ถ้าเป็นการแก้ไขข้อมูล (ไม่ใช่แค่ลายเซ็น)
      if (startLocation !== undefined || endLocation !== undefined || purpose !== undefined || startTime !== undefined ||
          endTime !== undefined || passengerCount !== undefined || tripType !== undefined ||
          additionalNotes !== undefined || expresswayOption !== undefined) {
        if (!requesterMayEditBookingDetails(bookingForAuth.status)) {
          return NextResponse.json({
            error: 'ไม่สามารถแก้ไขคำขอที่อยู่ในสถานะนี้ได้ (แก้ไขได้เฉพาะคำขอที่ยังดำเนินการอยู่)',
          }, { status: 400 });
        }

        // อัปเดตข้อมูลการจอง
        const updateData: {
          startLocation?: string;
          endLocation?: string;
          purpose?: string;
          startTime?: Date | null;
          endTime?: Date | null;
          passengerCount?: number | null;
          tripType?: TripType | null;
          expresswayOption?: ExpresswayOption;
          requesterSignatureUrl?: string | null;
          additionalNotes?: string | null;
        } = {};
        if (startLocation !== undefined) updateData.startLocation = startLocation;
        if (endLocation !== undefined) updateData.endLocation = endLocation;
        if (purpose !== undefined) updateData.purpose = purpose;
        if (additionalNotes !== undefined) updateData.additionalNotes = additionalNotes?.trim() || null;
        if (startTime !== undefined) {
          if (!startTime) {
            updateData.startTime = null;
          } else {
            const parsedStartTime = parseMaybeDateInput(startTime);
            if (!parsedStartTime) {
              return NextResponse.json({ error: 'Invalid startTime format' }, { status: 400 });
            }
            updateData.startTime = parsedStartTime;
          }
        }
        if (endTime !== undefined) {
          if (!endTime) {
            updateData.endTime = null;
          } else {
            const parsedEndTime = parseMaybeDateInput(endTime);
            if (!parsedEndTime) {
              return NextResponse.json({ error: 'Invalid endTime format' }, { status: 400 });
            }
            updateData.endTime = parsedEndTime;
          }
        }
        if (passengerCount !== undefined) {
          updateData.passengerCount = typeof passengerCount === 'number' 
            ? passengerCount 
            : passengerCount ? parseInt(passengerCount.toString(), 10) : null;
        }
        if (tripType !== undefined) {
          let normalizedTrip = tripType || null;
          if (normalizedTrip === 'PICK_UP') normalizedTrip = 'ONE_WAY';
          if (normalizedTrip && normalizedTrip !== 'ONE_WAY' && normalizedTrip !== 'ROUND_TRIP') {
            return NextResponse.json({ error: 'Invalid trip type' }, { status: 400 });
          }
          updateData.tripType = normalizedTrip;
        }
        if (expresswayOption !== undefined) {
          const validExpressway = ['EXPRESSWAY', 'NO_EXPRESSWAY'];
          if (expresswayOption == null || !validExpressway.includes(expresswayOption)) {
            return NextResponse.json(
              { error: 'กรุณาเลือกการใช้ทางด่วนหรือไม่ใช้ทางด่วน' },
              { status: 400 }
            );
          }
          updateData.expresswayOption = expresswayOption as ExpresswayOption;
        }
        if (requesterSignatureUrl !== undefined) updateData.requesterSignatureUrl = requesterSignatureUrl || null;

        const effectiveStartTime = updateData.startTime !== undefined ? updateData.startTime : bookingForAuth.startTime;
        const effectiveEndTime = updateData.endTime !== undefined ? updateData.endTime : bookingForAuth.endTime;
        if (effectiveStartTime && effectiveEndTime && effectiveEndTime.getTime() < effectiveStartTime.getTime()) {
          return NextResponse.json(
            { error: 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น' },
            { status: 400 }
          );
        }
        if (effectiveStartTime && isBeforeBangkokStartOfToday(effectiveStartTime)) {
          return NextResponse.json(
            { error: 'ไม่สามารถเลือกวันที่ย้อนหลังได้' },
            { status: 400 }
          );
        }
        if (effectiveEndTime && isBeforeBangkokStartOfToday(effectiveEndTime)) {
          return NextResponse.json(
            { error: 'ไม่สามารถเลือกวันที่ย้อนหลังได้' },
            { status: 400 }
          );
        }

        const updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: updateData,
        });

        await writeUsageLog({
          action: 'UPDATE',
          path: '/my-bookings',
          userId: session.user.id,
          role: session.user.role as Role,
          entityType: 'Booking',
          entityId: bookingId,
          message: `ผู้ใช้ ${actorName(session)} แก้ไขรายละเอียดคำขอจองรถ`,
        });

        // In-app: แจ้ง Admin/Executive และคนขับ (ถ้ามี)
        try {
          const recipients = await prisma.user.findMany({
            where: { role: { in: ['Admin', 'Executive'] } },
            select: { id: true },
          });
          await createNotifications([
            ...recipients.map((u) => ({
              userId: u.id,
              type: 'BOOKING_UPDATED',
              title: 'มีการแก้ไขคำขอจองรถ',
              message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
              href: '/admin/admin-approvals',
              entityType: 'Booking',
              entityId: bookingId,
              severity: 'INFO' as const,
            })),
            ...(updatedBooking.driverId
              ? [
                  {
                    userId: updatedBooking.driverId,
                    type: 'BOOKING_UPDATED',
                    title: 'มีการแก้ไขรายละเอียดงาน',
                    message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
                    href: '/driver',
                    entityType: 'Booking',
                    entityId: bookingId,
                    severity: 'INFO' as const,
                  },
                ]
              : []),
          ]);
        } catch (err) {
          console.error('Failed to create update notifications:', err);
        }

        return NextResponse.json(updatedBooking);
      } else if (requesterSignatureUrl !== undefined) {
        // อัปเดตเฉพาะลายเซ็น (สามารถทำได้ทุกสถานะ)
        const updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            requesterSignatureUrl: requesterSignatureUrl || null,
          },
        });

        await writeUsageLog({
          action: 'UPDATE',
          path: '/my-bookings',
          userId: session.user.id,
          role: session.user.role as Role,
          entityType: 'Booking',
          entityId: bookingId,
          message: `ผู้ใช้ ${actorName(session)} อัปเดตลายเซ็นผู้ขอใช้รถ`,
        });

        return NextResponse.json(updatedBooking);
      } else {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }
    } else if (
      (session.user.role === 'Admin' || session.user.role === 'Executive') &&
      (status === 'APPROVED' || status === 'REJECTED')
    ) {
      // Admin และ Executive สามารถอนุมัติเบื้องต้นได้
      if (status === 'REJECTED') {
        const reason = typeof rejectionReason === 'string' ? rejectionReason.trim() : '';
        if (!reason) {
          return NextResponse.json({ error: 'กรุณาระบุเหตุผลในการปฏิเสธ' }, { status: 400 });
        }
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
          ...(status === 'APPROVED' ? { adminApprovedAt: new Date() } : {}),
          ...(status === 'REJECTED'
            ? {
                rejectionReason: (rejectionReason as string).trim(),
                rejectedAt: new Date(),
              }
            : {
                rejectionReason: null,
                rejectedAt: null,
              }),
          ...(status === 'APPROVED' && vehicleId ? { vehicleId } : {}),
          ...(status === 'APPROVED' && driverId ? { driverId } : {}),
        },
        include: {
          requester: { select: { role: true } },
        },
      });

      await writeUsageLog({
        action: 'UPDATE',
        path: session.user.role === 'Executive' ? '/executive/admin-approvals' : '/admin/dashboard',
        userId: session.user.id,
        role: session.user.role as Role,
        entityType: 'Booking',
        entityId: bookingId,
        message:
          status === 'APPROVED'
            ? `ผู้มีสิทธิ์ ${actorName(session)} อนุมัติคำขอ และจัดสรรรถ/คนขับ (เบื้องต้น)`
            : `ผู้มีสิทธิ์ ${actorName(session)} ปฏิเสธคำขอจองรถ`,
      });

      const requesterInboxHref = inboxHrefForUserRole(updatedBooking.requester.role);

      // In-app: แจ้ง Requester/Driver/Executive (รอยืนยัน) ตามสถานะ
      try {
        if (status === 'APPROVED') {
          const recipientsExec = await prisma.user.findMany({
            where: { role: 'Executive' },
            select: { id: true },
          });

          await createNotifications([
            {
              userId: updatedBooking.requesterId,
              type: 'BOOKING_APPROVED',
              title: 'คำขอของคุณได้รับการอนุมัติเบื้องต้น',
              message: `เลขที่การจอง: ${bookingId.slice(0, 8)}… (รอยืนยันขั้นสุดท้าย)`,
              href: requesterInboxHref,
              entityType: 'Booking',
              entityId: bookingId,
              severity: 'SUCCESS' as const,
            },
            ...(updatedBooking.driverId
              ? [
                  {
                    userId: updatedBooking.driverId,
                    type: 'JOB_ASSIGNED_PRELIM',
                    title: 'ได้รับมอบหมายงานเบื้องต้น',
                    message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
                    href: '/driver',
                    entityType: 'Booking',
                    entityId: bookingId,
                    severity: 'INFO' as const,
                  },
                ]
              : []),
            ...recipientsExec.map((u) => ({
              userId: u.id,
              type: 'BOOKING_NEEDS_CONFIRMATION',
              title: 'มีรายการรอยืนยัน',
              message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
              href: '/executive/approvals',
              entityType: 'Booking',
              entityId: bookingId,
              severity: 'INFO' as const,
            })),
          ]);
        } else if (status === 'REJECTED') {
          const reason = typeof rejectionReason === 'string' ? rejectionReason.trim() : '';
          await createNotifications([
            {
              userId: updatedBooking.requesterId,
              type: 'BOOKING_REJECTED',
              title: 'คำขอของคุณถูกปฏิเสธจากผู้อนุมัติ',
              message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…${reason ? `\nเหตุผล: ${reason}` : ''}`,
              href: requesterInboxHref,
              entityType: 'Booking',
              entityId: bookingId,
              severity: 'ERROR' as const,
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to create approval/rejection notifications:', err);
      }

      // แจ้งเตือน LINE ผู้ขอเมื่ออนุมัติเบื้องต้น
      if (status === 'APPROVED') {
        const bookingWithRequester = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            requester: {
              select: {
                lineUserId: true,
                name: true,
                position: true,
                phoneNumber: true,
              },
            },
            vehicle: {
              select: {
                brand: true,
                model: true,
                color: true,
                licensePlate: true,
              },
            },
            driver: {
              select: {
                lineUserId: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
        });
        if (bookingWithRequester?.requester?.lineUserId) {
          const msg = buildBookingNotification('BOOKING_APPROVED', {
            id: bookingWithRequester.id,
            status: bookingWithRequester.status,
            purpose: bookingWithRequester.purpose,
            endLocation: bookingWithRequester.endLocation,
            startTime: bookingWithRequester.startTime,
            endTime: bookingWithRequester.endTime,
            passengerCount: bookingWithRequester.passengerCount,
            requestForSelf: bookingWithRequester.requestForSelf,
            travelerName: bookingWithRequester.travelerName,
            travelerPosition: bookingWithRequester.travelerPosition,
            travelerPhone: bookingWithRequester.travelerPhone,
            requester: {
              name: bookingWithRequester.requester.name,
              position: bookingWithRequester.requester.position,
              phoneNumber: bookingWithRequester.requester.phoneNumber,
            },
            vehicle: bookingWithRequester.vehicle
              ? {
                  brand: bookingWithRequester.vehicle.brand,
                  model: bookingWithRequester.vehicle.model,
                  color: bookingWithRequester.vehicle.color,
                  licensePlate: bookingWithRequester.vehicle.licensePlate,
                }
              : null,
            driver: bookingWithRequester.driver
              ? {
                  name: bookingWithRequester.driver.name,
                  phoneNumber: bookingWithRequester.driver.phoneNumber,
                }
              : null,
          });
          sendLineMessage(bookingWithRequester.requester.lineUserId, msg).catch((e) =>
            console.error('LINE approved notification:', e)
          );
        }

        if (bookingWithRequester?.driver?.lineUserId) {
          const driverMsg = buildBookingNotification('BOOKING_APPROVED_DRIVER', {
            id: bookingWithRequester.id,
            status: bookingWithRequester.status,
            purpose: bookingWithRequester.purpose,
            endLocation: bookingWithRequester.endLocation,
            startTime: bookingWithRequester.startTime,
            endTime: bookingWithRequester.endTime,
            passengerCount: bookingWithRequester.passengerCount,
            requestForSelf: bookingWithRequester.requestForSelf,
            travelerName: bookingWithRequester.travelerName,
            travelerPosition: bookingWithRequester.travelerPosition,
            travelerPhone: bookingWithRequester.travelerPhone,
            requester: {
              name: bookingWithRequester.requester.name,
              position: bookingWithRequester.requester.position,
              phoneNumber: bookingWithRequester.requester.phoneNumber,
            },
            vehicle: bookingWithRequester.vehicle
              ? {
                  brand: bookingWithRequester.vehicle.brand,
                  model: bookingWithRequester.vehicle.model,
                  color: bookingWithRequester.vehicle.color,
                  licensePlate: bookingWithRequester.vehicle.licensePlate,
                }
              : null,
            driver: bookingWithRequester.driver
              ? {
                  name: bookingWithRequester.driver.name,
                  phoneNumber: bookingWithRequester.driver.phoneNumber,
                }
              : null,
          });
          sendLineMessage(bookingWithRequester.driver.lineUserId, driverMsg).catch((e) =>
            console.error('LINE approved driver assignment notification:', e)
          );
        }
      }

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
        include: {
          requester: { select: { role: true } },
        },
      });

      await writeUsageLog({
        action: 'UPDATE',
        path: '/executive/approvals',
        userId: session.user.id,
        role: 'Executive',
        entityType: 'Booking',
        entityId: bookingId,
        message: `ผู้บริหาร ${actorName(session)} ยืนยันคำขอขั้นสุดท้าย และจัดสรรรถ/คนขับ`,
      });

      const requesterInboxHrefExec = inboxHrefForUserRole(updatedBooking.requester.role);

      // In-app: แจ้ง Requester + Driver ว่ายืนยันแล้ว
      try {
        await createNotifications(
          [
          {
            userId: updatedBooking.requesterId,
            type: 'BOOKING_CONFIRMED',
            title: 'การจองรถได้รับการยืนยันขั้นสุดท้าย',
            message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
            href: requesterInboxHrefExec,
            entityType: 'Booking',
            entityId: bookingId,
            severity: 'SUCCESS' as const,
          },
          ...(updatedBooking.driverId
            ? [
                {
                  userId: updatedBooking.driverId,
                  type: 'JOB_ASSIGNED_FINAL',
                  title: 'ได้รับมอบหมายงานขั้นสุดท้าย',
                  message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
                  href: '/driver',
                  entityType: 'Booking',
                  entityId: bookingId,
                  severity: 'SUCCESS' as const,
                },
              ]
            : []),
        ]
        );
      } catch (err) {
        console.error('Failed to create confirmation notifications:', err);
      }

      // แจ้งเตือน LINE ผู้ขอเมื่อยืนยันขั้นสุดท้าย
      const bookingForNotif = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          requester: {
            select: {
              lineUserId: true,
              name: true,
              position: true,
              phoneNumber: true,
            },
          },
          vehicle: {
            select: {
              brand: true,
              model: true,
              color: true,
              licensePlate: true,
            },
          },
          driver: {
            select: {
              lineUserId: true,
              name: true,
              phoneNumber: true,
            },
          },
        },
      });
      if (bookingForNotif?.requester?.lineUserId) {
        const msg = buildBookingNotification('BOOKING_CONFIRMED', {
          id: bookingForNotif.id,
          status: bookingForNotif.status,
          purpose: bookingForNotif.purpose,
          endLocation: bookingForNotif.endLocation,
          startTime: bookingForNotif.startTime,
          endTime: bookingForNotif.endTime,
          passengerCount: bookingForNotif.passengerCount,
          requestForSelf: bookingForNotif.requestForSelf,
          travelerName: bookingForNotif.travelerName,
          travelerPosition: bookingForNotif.travelerPosition,
          travelerPhone: bookingForNotif.travelerPhone,
          requester: {
            name: bookingForNotif.requester.name,
            position: bookingForNotif.requester.position,
            phoneNumber: bookingForNotif.requester.phoneNumber,
          },
          vehicle: bookingForNotif.vehicle
            ? {
                brand: bookingForNotif.vehicle.brand,
                model: bookingForNotif.vehicle.model,
                color: bookingForNotif.vehicle.color,
                licensePlate: bookingForNotif.vehicle.licensePlate,
              }
            : null,
          driver: bookingForNotif.driver
            ? {
                name: bookingForNotif.driver.name,
                phoneNumber: bookingForNotif.driver.phoneNumber,
              }
            : null,
        });
        sendLineMessage(bookingForNotif.requester.lineUserId, msg).catch((e) =>
          console.error('LINE confirmed notification:', e)
        );
      }

      if (bookingForNotif?.driver?.lineUserId) {
        const driverMsg = buildBookingNotification('BOOKING_CONFIRMED_DRIVER', {
          id: bookingForNotif.id,
          status: bookingForNotif.status,
          purpose: bookingForNotif.purpose,
          endLocation: bookingForNotif.endLocation,
          startTime: bookingForNotif.startTime,
          endTime: bookingForNotif.endTime,
          passengerCount: bookingForNotif.passengerCount,
          requestForSelf: bookingForNotif.requestForSelf,
          travelerName: bookingForNotif.travelerName,
          travelerPosition: bookingForNotif.travelerPosition,
          travelerPhone: bookingForNotif.travelerPhone,
          requester: {
            name: bookingForNotif.requester.name,
            position: bookingForNotif.requester.position,
            phoneNumber: bookingForNotif.requester.phoneNumber,
          },
          vehicle: bookingForNotif.vehicle
            ? {
                brand: bookingForNotif.vehicle.brand,
                model: bookingForNotif.vehicle.model,
                color: bookingForNotif.vehicle.color,
                licensePlate: bookingForNotif.vehicle.licensePlate,
              }
            : null,
          driver: bookingForNotif.driver
            ? {
                name: bookingForNotif.driver.name,
                phoneNumber: bookingForNotif.driver.phoneNumber,
              }
            : null,
        });
        sendLineMessage(bookingForNotif.driver.lineUserId, driverMsg).catch((e) =>
          console.error('LINE driver assignment notification:', e)
        );
      }

      // อัปเดต signature URL ใน user profile
      if (signatureImageUrl && saveExecutiveSignatureToProfile !== false) {
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

    // เจ้าของการจอง (ทุก role) ลบได้เฉพาะคำขอที่อยู่ในสถานะ PENDING
    if (booking.requesterId === session.user.id) {
      if (booking.status !== 'PENDING') {
        return NextResponse.json({ 
          error: 'สามารถลบได้เฉพาะคำขอที่อยู่ในสถานะ PENDING เท่านั้น' 
        }, { status: 400 });
      }

      await prisma.booking.delete({
        where: { id: bookingId },
      });

      await writeUsageLog({
        action: 'DELETE',
        path: '/my-bookings',
        userId: session.user.id,
        role: session.user.role as Role,
        entityType: 'Booking',
        entityId: bookingId,
        message: `ผู้ใช้ ${actorName(session)} ลบคำขอจองรถ (สถานะ PENDING)`,
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
