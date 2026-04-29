import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

// GET: ดึงข้อมูล drivers ทั้งหมด
export async function GET() {
  const session = await getServerSession(authOptions);
  // Admin และ Executive สามารถเข้าถึงได้
  if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Executive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const drivers = await prisma.user.findMany({
      where: {
        role: 'Driver',
      },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        phoneNumber: true,
        profileImageUrl: true,
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

