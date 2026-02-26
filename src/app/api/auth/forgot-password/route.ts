import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/email';

const TOKEN_EXPIRY_HOURS = 1;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'กรุณากรอกอีเมล' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

      await prisma.verificationToken.create({
        data: { identifier: email, token, expires },
      });

      const baseUrl =
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        (req.nextUrl?.origin ?? '');
      const resetLink = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

      await sendMail({
        to: email,
        subject: 'รีเซ็ตรหัสผ่าน - OFM PROMPTGO',
        html: `
          <p>สวัสดีครับ/ค่ะ</p>
          <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชีอีเมลนี้</p>
          <p>คลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์ใช้ได้ ${TOKEN_EXPIRY_HOURS} ชั่วโมง):</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>ถ้าคุณไม่ได้ขอรายการนี้ กรุณาละเว้นอีเมลนี้</p>
          <p>— OFM PROMPTGO</p>
        `,
      });
    }

    return NextResponse.json({
      message:
        'ถ้ามีอีเมลในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่านทางอีเมล กรุณาตรวจสอบกล่องจดหมาย',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง' },
      { status: 500 }
    );
  }
}
