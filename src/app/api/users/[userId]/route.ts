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

    // ตรวจสอบสิทธิ์: Admin สามารถแก้ไขได้ทุกคน, Requester แก้ไขได้เฉพาะตัวเอง
    if (session.user.role === 'Admin') {
      // Admin สามารถแก้ไขได้ทุกคน
      // ตรวจสอบว่าตำแหน่งต้องกรอก
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
    } else if (session.user.role === 'Requester' && session.user.id === userId) {
      // Requester สามารถแก้ไขข้อมูลส่วนตัวของตัวเองได้ (ไม่สามารถเปลี่ยน role)
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

      // ถ้ามี position ให้อัปเดตด้วย
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
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
