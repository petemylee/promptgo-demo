// src/app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  // 1. ตรวจสอบ Session และสิทธิ์การใช้งาน
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. ดึงข้อมูลจาก Frontend
    const body = await req.json();
    const { endLocation, purpose, startTime, endTime, requesterSignatureUrl } = body;

    // 3. ตรวจสอบข้อมูลเบื้องต้น
    if (!endLocation || !purpose || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 4. สร้างข้อมูลการจองใหม่ในฐานข้อมูล
    const newBooking = await prisma.booking.create({
      data: {
        endLocation,
        purpose,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'PENDING', // กำหนดสถานะเริ่มต้น
        requesterId: session.user.id, // เชื่อมโยงกับผู้ใช้ที่ Login อยู่
        requesterSignatureUrl: requesterSignatureUrl || null, // ลายเซ็นผู้ขอใช้รถ (ถ้ามี)
      },
    });

    // 5. ส่งข้อมูลที่สร้างสำเร็จกลับไป
    return NextResponse.json(newBooking, { status: 201 });

  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ========== เพิ่มฟังก์ชันนี้เข้าไปใหม่ ==========
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
                name: true,
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
        include: { requester: { select: { name: true, position: true } } },
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
    } else {
      // สำหรับ Executive และ roles อื่นๆ: ส่งข้อมูลการจองทั้งหมด
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