import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!token) {
      return NextResponse.json(
        { error: 'ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่' },
        { status: 400 }
      );
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verification || verification.expires < new Date()) {
      return NextResponse.json(
        { error: 'ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่' },
        { status: 400 }
      );
    }

    const email = verification.identifier;
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้ที่เกี่ยวข้องกับลิงก์นี้' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier: email, token } },
      }),
    ]);

    return NextResponse.json({ message: 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง' },
      { status: 500 }
    );
  }
}
