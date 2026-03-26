import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { type Role } from '@prisma/client';
import { authOptions } from '../../auth/[...nextauth]/route';
import { writeUsageLog } from '@/lib/usageLogs';

function actorName(session: Session | null) {
  return session?.user?.name || session?.user?.email || session?.user?.id || 'ไม่ทราบชื่อ';
}

// DELETE: ลบผู้ใช้
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Executive') {
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
    // ป้องกันการลบผู้ใช้ที่ยังเป็น requester ของ booking (requesterId เป็น required)
    const requesterBookingsCount = await prisma.booking.count({
      where: { requesterId: userId },
    });
    if (requesterBookingsCount > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete user because there are existing bookings created by this user.',
          code: 'USER_HAS_BOOKINGS',
          details: { requesterBookingsCount },
        },
        { status: 409 }
      );
    }

    // เคลียร์ความสัมพันธ์ที่เป็น optional เพื่อให้ลบได้ (กัน foreign key constraint)
    await prisma.booking.updateMany({
      where: { adminApproverId: userId },
      data: { adminApproverId: null },
    });
    await prisma.booking.updateMany({
      where: { executiveConfirmerId: userId },
      data: { executiveConfirmerId: null },
    });
    await prisma.booking.updateMany({
      where: { driverId: userId },
      data: { driverId: null },
    });

    const deleted = await prisma.user.delete({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    const actor = actorName(session);
    const target = deleted.name || deleted.email;
    await writeUsageLog({
      action: 'DELETE',
      path: '/admin/users',
      userId: session.user.id,
      role: session.user.role as Role,
      entityType: 'User',
      entityId: deleted.id,
      message: `${session.user.role === 'Executive' ? 'ผู้บริหาร' : 'แอดมิน'} ${actor} ลบผู้ใช้ ${target}`,
    });

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    // Prisma foreign key constraint error (e.g., related records exist)
    const isFkError =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2003';
    if (isFkError) {
      return NextResponse.json(
        {
          error:
            'Cannot delete user because there are related records referencing this user.',
          code: 'FK_CONSTRAINT',
        },
        { status: 409 }
      );
    }
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
    const { name, email, role, position, phoneNumber, isActive, signatureImageUrl } = body;

    // ตรวจสอบสิทธิ์: Admin แก้ไขได้ทุกคน (รวม role), ผู้ใช้ทุก role แก้ไขข้อมูลตัวเองได้ (ไม่รวม role)
    const isEditingSelf = session.user.id === userId;
    if ((session.user.role === 'Admin' || session.user.role === 'Executive') && !isEditingSelf) {
      // Admin/Executive แก้ไขผู้ใช้คนอื่น
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
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
        },
      });

      const actor = actorName(session);
      const target = updatedUser.name || updatedUser.email;
      const statusChange =
        typeof isActive === 'boolean' ? (isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน (Deactivate)') : null;
      await writeUsageLog({
        action: 'UPDATE',
        path: '/admin/users',
        userId: session.user.id,
        role: session.user.role as Role,
        entityType: 'User',
        entityId: updatedUser.id,
        message: statusChange
          ? `${session.user.role === 'Executive' ? 'ผู้บริหาร' : 'แอดมิน'} ${actor} ${statusChange} ผู้ใช้ ${target}`
          : `${session.user.role === 'Executive' ? 'ผู้บริหาร' : 'แอดมิน'} ${actor} แก้ไขข้อมูลผู้ใช้ ${target}`,
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
        signatureImageUrl?: string | null;
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
      if (signatureImageUrl !== undefined) {
        updateData.signatureImageUrl = signatureImageUrl?.trim() || null;
      }
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      await writeUsageLog({
        action: 'UPDATE',
        path: '/profile',
        userId: session.user.id,
        role: session.user.role as Role,
        entityType: 'User',
        entityId: updatedUser.id,
        message: 'แก้ไขโปรไฟล์ของตนเอง',
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
