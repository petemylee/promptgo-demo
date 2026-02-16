import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// DELETE: ลบผู้ใช้
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ป้องกัน Admin ลบบัญชีตัวเอง
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account.' },
      { status: 403 }
    );
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH: อัปเดตผู้ใช้
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, role, position, phoneNumber } = body;

    // ตรวจสอบสิทธิ์: Admin แก้ไขได้ทุกคน (รวม role), ผู้ใช้ทุก role แก้ไขข้อมูลตัวเองได้ (ไม่รวม role)
    const isEditingSelf = session.user.id === userId;
    if (session.user.role === 'Admin' && !isEditingSelf) {
      // Admin แก้ไขผู้ใช้คนอื่น
      if (!position || position.trim() === '') {
        return NextResponse.json({ error: 'Position is required' }, { status: 400 });
      }
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          email,
          role,
          position: position.trim(),
          phoneNumber: phoneNumber?.trim() || null,
        },
      });
      return NextResponse.json(updatedUser, { status: 200 });
    }
    if (isEditingSelf) {
      // แก้ไขข้อมูลส่วนตัวตัวเอง (ทุก role) – ไม่เปลี่ยน role
      const updateData: {
        name?: string;
        email?: string;
        phoneNumber?: string | null;
        position?: string;
      } = {
        name: name?.trim(),
        email: email?.trim(),
        phoneNumber: phoneNumber?.trim() || null,
      };
      if (position !== undefined) {
        if (!position || position.trim() === '') {
          return NextResponse.json({ error: 'Position is required' }, { status: 400 });
        }
        updateData.position = position.trim();
      }
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
      return NextResponse.json(updatedUser, { status: 200 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
