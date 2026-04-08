// src/app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
// ✅ 1. นำเข้าฟังก์ชันส่งไลน์
import { sendLineMessage } from '@/lib/line';
import { buildBookingNotification } from '@/lib/lineNotifications';
import { parseMaybeDateInput, isBeforeBangkokStartOfToday } from '@/lib/dateTime';
import { createNotifications } from '@/lib/notifications';
import { inboxHrefForUserRole } from '@/lib/inboxHrefForRole';

export async function POST(req: Request) {
  // 1. ตรวจสอบ Session และสิทธิ์การใช้งาน
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // สร้างคำขอจองได้เฉพาะ role ผู้ขอใช้รถ (Requester) เท่านั้น
  if (session.user.role !== 'Requester') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 2. ดึงข้อมูลจาก Frontend
    const body = await req.json();
    const { startLocation, endLocation, purpose, startTime, endTime, passengerCount, tripType, expresswayOption, requestForSelf, travelerName, travelerPosition, travelerPhone, requesterSignatureUrl, additionalNotes } = body;

    // 3. ตรวจสอบข้อมูลเบื้องต้น
    if (!startLocation || !endLocation || !purpose || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ตรวจสอบ passengerCount
    const passengerCountNum = passengerCount ? parseInt(passengerCount, 10) : null;
    if (passengerCountNum === null || isNaN(passengerCountNum) || passengerCountNum < 1) {
      return NextResponse.json({ error: 'Passenger count must be at least 1' }, { status: 400 });
    }

    // ตรวจสอบ tripType
    const validTripTypes = ['ONE_WAY', 'ROUND_TRIP'];
    let normalizedTripType = tripType || null;
    if (normalizedTripType === 'PICK_UP') normalizedTripType = 'ONE_WAY';
    if (normalizedTripType && !validTripTypes.includes(normalizedTripType)) {
      return NextResponse.json({ error: 'Invalid trip type' }, { status: 400 });
    }

    // ตรวจสอบ expresswayOption (สำหรับเลือก template ในอนาคต)
    const validExpresswayOptions = ['EXPRESSWAY', 'NO_EXPRESSWAY'];
    if (expresswayOption && !validExpresswayOptions.includes(expresswayOption)) {
      return NextResponse.json({ error: 'Invalid expressway option' }, { status: 400 });
    }

    // ตรวจสอบข้อมูลเมื่อขอใช้สำหรับบุคคลอื่น
    const isForSelf = requestForSelf !== false;
    if (!isForSelf) {
      if (!travelerName?.trim() || !travelerPosition?.trim() || !travelerPhone?.trim()) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลผู้เดินทางให้ครบถ้วน' }, { status: 400 });
      }
    }

    // 4. สร้างข้อมูลการจองใหม่ในฐานข้อมูล
    const parsedStartTime = parseMaybeDateInput(startTime);
    const parsedEndTime = parseMaybeDateInput(endTime);
    if (!parsedStartTime || !parsedEndTime) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    if (parsedEndTime.getTime() < parsedStartTime.getTime()) {
      return NextResponse.json({ error: 'End time must be greater than or equal to start time' }, { status: 400 });
    }
    if (isBeforeBangkokStartOfToday(parsedStartTime) || isBeforeBangkokStartOfToday(parsedEndTime)) {
      return NextResponse.json({ error: 'ไม่สามารถเลือกวันที่ย้อนหลังได้' }, { status: 400 });
    }

    const createData = {
      startLocation,
      endLocation,
      purpose,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      passengerCount: passengerCountNum,
      tripType: normalizedTripType,
      expresswayOption: expresswayOption || null,
      requestForSelf: isForSelf,
      travelerName: isForSelf ? null : (travelerName?.trim() || null),
      travelerPosition: isForSelf ? null : (travelerPosition?.trim() || null),
      travelerPhone: isForSelf ? null : (travelerPhone?.trim() || null),
      status: 'PENDING' as const,
      requesterId: session.user.id,
      requesterSignatureUrl: requesterSignatureUrl || null,
      additionalNotes: additionalNotes?.trim() || null,
    };
    const newBooking = await prisma.booking.create({
      data: createData,
    });

    // ==========================================
    // ✅ In-app notifications: Admin/Executive + Requester
    // ==========================================
    try {
      const recipients = await prisma.user.findMany({
        where: { role: { in: ['Admin', 'Executive'] } },
        select: { id: true },
      });

      const requesterId = session.user.id;
      const bookingId = newBooking.id;
      const selfInboxHref = inboxHrefForUserRole(session.user.role);

      await createNotifications([
        ...recipients.map((u) => ({
          userId: u.id,
          type: 'BOOKING_CREATED',
          title: 'มีคำขอจองรถใหม่',
          message: `เลขที่การจอง: ${bookingId.slice(0, 8)}…`,
          href: '/admin/admin-approvals',
          entityType: 'Booking',
          entityId: bookingId,
          severity: 'INFO' as const,
        })),
        {
          userId: requesterId,
          type: 'BOOKING_CREATED',
          title: 'สร้างคำขอจองรถสำเร็จ',
          message: `เลขที่การจอง: ${bookingId.slice(0, 8)}… (รอการพิจารณา)`,
          href: selfInboxHref,
          entityType: 'Booking',
          entityId: bookingId,
          severity: 'SUCCESS' as const,
        },
      ]);
    } catch (err) {
      console.error('Failed to create in-app notifications:', err);
    }

    // ==========================================
    // ✅ 5. แจ้งเตือน LINE ไปยังทุก Admin ที่ผูก LINE แล้ว (จาก DB)
    // ==========================================
    try {
      const adminsWithLine = await prisma.user.findMany({
        where: {
          role: { in: ['Admin', 'Executive'] },
          lineUserId: { not: null },
        },
        select: { lineUserId: true },
      });
      const adminLineIds = adminsWithLine.map((u) => u.lineUserId).filter((id): id is string => !!id);

      // แจ้งผู้ขอ (requester) ถ้าผูก LINE แล้ว
      const requester = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: {
          lineUserId: true,
          name: true,
          position: true,
          phoneNumber: true,
        },
      });
      const requesterName = requester?.name || session.user.name || null;
      const requesterPosition = requester?.position || null;
      const requesterPhone = requester?.phoneNumber || null;

      if (adminLineIds.length > 0) {
        const message = buildBookingNotification('BOOKING_CREATED_ADMIN', {
          id: newBooking.id,
          status: newBooking.status,
          purpose: newBooking.purpose,
          endLocation: newBooking.endLocation,
          startTime: newBooking.startTime,
          endTime: newBooking.endTime,
          passengerCount: newBooking.passengerCount,
          requestForSelf: newBooking.requestForSelf,
          travelerName: newBooking.travelerName,
          travelerPosition: newBooking.travelerPosition,
          travelerPhone: newBooking.travelerPhone,
          requester: {
            name: requesterName,
            position: requesterPosition,
            phoneNumber: requesterPhone,
          },
          vehicle: null,
          driver: null,
        });

        await Promise.all(adminLineIds.map((lineUserId) => sendLineMessage(lineUserId, message)));
      }

      if (requester?.lineUserId) {
        const requesterMsg = buildBookingNotification('BOOKING_CREATED_REQUESTER', {
          id: newBooking.id,
          status: newBooking.status,
          purpose: newBooking.purpose,
          endLocation: newBooking.endLocation,
          startTime: newBooking.startTime,
          endTime: newBooking.endTime,
          passengerCount: newBooking.passengerCount,
          requestForSelf: newBooking.requestForSelf,
          travelerName: newBooking.travelerName,
          travelerPosition: newBooking.travelerPosition,
          travelerPhone: newBooking.travelerPhone,
          requester: {
            name: requesterName,
            position: requesterPosition,
            phoneNumber: requesterPhone,
          },
          vehicle: null,
          driver: null,
        });
        sendLineMessage(requester.lineUserId, requesterMsg).catch((e) => console.error('LINE to requester:', e));
      }
    } catch (lineError) {
      console.error("Failed to send LINE notification:", lineError);
    }
    // ==========================================

    // 6. ส่งข้อมูลที่สร้างสำเร็จกลับไป
    return NextResponse.json(newBooking, { status: 201 });

  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ========== ฟังก์ชัน GET เดิม (คงไว้เหมือนเดิมทุกประการ) ==========
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const allBookings = url.searchParams.get('all') === 'true';
    const adminDashboard = url.searchParams.get('adminDashboard') === 'true';
    const executiveHistory = url.searchParams.get('executiveHistory') === 'true';

    // Executive ทำงานแทน Admin: ใช้ query เพื่อขอข้อมูลรูปแบบ Admin dashboard/history
    if ((adminDashboard || allBookings) && (session.user.role === 'Admin' || session.user.role === 'Executive')) {
      if (allBookings) {
        const bookings = await prisma.booking.findMany({
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
                type: true,
                vehicleImageUrl: true,
              }
            },
            driver: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImageUrl: true,
              }
            },
            driverFeedback: {
              select: {
                id: true,
                rating: true,
                comment: true,
                requester: { select: { name: true } },
              }
            }
          },
          orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
        });
        return NextResponse.json(bookings);
      }

      const pendingBookings = await prisma.booking.findMany({
        where: { status: 'PENDING' },
        include: { 
          requester: { 
            select: { 
              name: true, 
              position: true,
              email: true,
              phoneNumber: true
            } 
          } 
        },
        orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      });

      const pendingCount = await prisma.booking.count({ where: { status: 'PENDING' } });
      const approvedCount = await prisma.booking.count({ where: { status: 'APPROVED' } });
      const inProgressCount = await prisma.booking.count({ where: { status: 'IN_PROGRESS' } });

      return NextResponse.json({
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          inProgress: inProgressCount,
        },
        pendingBookings: pendingBookings,
      });
    } else if (session.user.role === 'Executive') {
      if (executiveHistory) {
        // สำหรับ Executive history: ส่งเฉพาะ bookings ที่ executive คนนี้เคยอนุมัติ
        const bookings = await prisma.booking.findMany({
          where: {
            executiveConfirmerId: session.user.id,
          },
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
                id: true,
                name: true,
                signatureImageUrl: true,
              }
            },
            vehicle: {
              select: {
                licensePlate: true,
                brand: true,
                model: true,
              }
            },
            driver: {
              select: {
                id: true,
                name: true,
              }
            },
            driverFeedback: {
              select: {
                id: true,
                rating: true,
                comment: true,
                requester: { select: { name: true } },
              }
            }
          },
          orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
        });
        return NextResponse.json(bookings);
      } else {
        // สำหรับ Executive dashboard: ส่งข้อมูลการจองทั้งหมด (เหมือนเดิม)
        const bookings = await prisma.booking.findMany({
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
                id: true,
                name: true,
                signatureImageUrl: true,
              }
            },
            vehicle: {
              select: {
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
          },
          orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
        });
        return NextResponse.json(bookings);
      }
    } else if (session.user.role === 'Admin') {
      // โหมดเดิมของ Admin: dashboard format (หรือ history เมื่อ all=true)
      if (allBookings) {
        const bookings = await prisma.booking.findMany({
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
                licensePlate: true,
                brand: true,
                model: true,
                type: true,
              }
            },
            driver: {
              select: {
                id: true,
                name: true,
              }
            },
            driverFeedback: {
              select: {
                id: true,
                rating: true,
                comment: true,
                requester: { select: { name: true } },
              }
            }
          },
          orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
        });
        return NextResponse.json(bookings);
      }

      const pendingBookings = await prisma.booking.findMany({
        where: { status: 'PENDING' },
        include: { 
          requester: { 
            select: { 
              name: true, 
              position: true,
              email: true,
              phoneNumber: true
            } 
          } 
        },
        orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      });

      const pendingCount = await prisma.booking.count({ where: { status: 'PENDING' } });
      const approvedCount = await prisma.booking.count({ where: { status: 'APPROVED' } });
      const inProgressCount = await prisma.booking.count({ where: { status: 'IN_PROGRESS' } });

      return NextResponse.json({
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          inProgress: inProgressCount,
        },
        pendingBookings: pendingBookings,
      });
    } else {
      // สำหรับ roles อื่นๆ: ส่งข้อมูลการจองทั้งหมด
      const bookings = await prisma.booking.findMany({
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
              id: true,
              name: true,
              signatureImageUrl: true,
            }
          },
          vehicle: {
            select: {
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
        },
        orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
      });
      return NextResponse.json(bookings);
    }

  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}