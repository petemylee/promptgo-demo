// src/app/api/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// DELETE: ลบผู้ใช้
export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.user.delete({
      where: { id: params.userId },
    });
    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: อัปเดตผู้ใช้ (ตัวอย่าง: อัปเดต role)
// สามารถขยายส่วนนี้เพื่ออัปเดตข้อมูลอื่นๆ ได้ในอนาคต
export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { role } = body;

    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: { role },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}