import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// DELETE: ลบผู้ใช้
export async function DELETE(
  req: NextRequest,
  context: { params: { userId: string } }
) {
  const { userId } = context.params;

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
  context: { params: { userId: string } }
) {
  const { userId } = context.params;

  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, role } = body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email, role },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
