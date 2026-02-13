// src/app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
// ✅ 1. นำเข้าฟังก์ชันส่งไลน์
import { sendLineMessage } from '@/lib/line';

export async function POST(req: Request) {
  // 1. ตรวจสอบ Session และสิทธิ์การใช้งาน
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. ดึงข้อมูลจาก Frontend
    const body = await req.json();
    const { endLocation, purpose, startTime, endTime, passengerCount, tripType, requesterSignatureUrl, passengerImageUrl } = body;

    // 3. ตรวจสอบข้อมูลเบื้องต้น
    if (!endLocation || !purpose || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ตรวจสอบ passengerCount
    const passengerCountNum = passengerCount ? parseInt(passengerCount, 10) : null;
    if (passengerCountNum === null || isNaN(passengerCountNum) || passengerCountNum < 1) {
      return NextResponse.json({ error: 'Passenger count must be at least 1' }, { status: 400 });
    }

    // ตรวจสอบ tripType
    const validTripTypes = ['ONE_WAY', 'PICK_UP', 'ROUND_TRIP'];
    if (tripType && !validTripTypes.includes(tripType)) {
      return NextResponse.json({ error: 'Invalid trip type' }, { status: 400 });
    }

    // 4. สร้างข้อมูลการจองใหม่ในฐานข้อมูล
    const newBooking = await prisma.booking.create({
      data: {
        endLocation,
        purpose,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        passengerCount: passengerCountNum,
        tripType: tripType || null,
        status: 'PENDING', // กำหนดสถานะเริ่มต้น
        requesterId: session.user.id, // เชื่อมโยงกับผู้ใช้ที่ Login อยู่
        requesterSignatureUrl: requesterSignatureUrl || null, // ลายเซ็นผู้ขอใช้รถ (ถ้ามี)
        passengerImageUrl: passengerImageUrl || null, // รูปภาพผู้โดยสาร (ถ้ามี)
      },
    });

    // ==========================================
    // ✅ 5. แจ้งเตือน LINE ไปยังทุก Admin ที่ผูก LINE แล้ว (จาก DB)
    // ==========================================
    try {
      const adminsWithLine = await prisma.user.findMany({
        where: { role: 'Admin', lineUserId: { not: null } },
        select: { lineUserId: true },
      });
      const adminLineIds = adminsWithLine.map((u) => u.lineUserId).filter((id): id is string => !!id);

      if (adminLineIds.length > 0) {
        const startDate = new Date(startTime);
        const dateStr = startDate.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const timeStr = startDate.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const message = `📢 มีรายการจองรถใหม่!\n\n` +
                        `👤 ผู้ขอ: ${session.user.name || 'ไม่ระบุ'}\n` +
                        `📍 ไปที่: ${endLocation}\n` +
                        `📅 วันที่: ${dateStr}\n` +
                        `⏰ เวลา: ${timeStr}\n` +
                        `📝 เหตุผล: ${purpose}`;

        await Promise.all(adminLineIds.map((lineUserId) => sendLineMessage(lineUserId, message)));
      }

      // แจ้งผู้ขอ (requester) ถ้าผูก LINE แล้ว
      const requester = await prisma.user.findUnique({
        where: { id: session.user.id as string },
        select: { lineUserId: true },
      });
      if (requester?.lineUserId) {
        const startDate = new Date(startTime);
        const dateStr = startDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const requesterMsg =
          `✅ สร้างคำขอจองรถสำเร็จ\n\n` +
          `📍 ไปที่: ${endLocation}\n` +
          `📅 วันที่: ${dateStr}\n` +
          `⏰ เวลา: ${timeStr}\n\n` +
          `กำลังรอการอนุมัติจากแอดมิน`;
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
    // ตรวจสอบ role เพื่อส่งข้อมูลที่เหมาะสม
    if (session.user.role === 'Admin') {
      // ตรวจสอบ query parameter เพื่อดูว่าต้องการข้อมูลทั้งหมดหรือ dashboard format
      const url = new URL(req.url);
      const allBookings = url.searchParams.get('all') === 'true';
      
      if (allBookings) {
        // สำหรับ Admin history: ส่งข้อมูล bookings ทั้งหมด
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
          orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(bookings);
      } else {
        // สำหรับ Admin dashboard: ส่งข้อมูล dashboard format
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
        orderBy: { createdAt: 'asc' },
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
      }
    } else if (session.user.role === 'Executive') {
      // ตรวจสอบ query parameter สำหรับ executive history
      const url = new URL(req.url);
      const executiveHistory = url.searchParams.get('executiveHistory') === 'true';
      
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
          orderBy: { createdAt: 'desc' },
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
          orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(bookings);
      }
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
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(bookings);
    }

  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}