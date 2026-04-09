import crypto from 'crypto';
import { sendMail } from '@/lib/email';

export function randomInitialPassword(length = 12) {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/[+/=]/g, '')
    .slice(0, length);
}

/** อีเมลต้อนรับ + รหัสผ่านเริ่มต้น — ใช้ร่วมกับ bulk import และการสร้างผู้ใช้ทีละคน */
export async function sendNewUserWelcomeEmail(params: {
  to: string;
  displayName: string;
  initialPassword: string;
}): Promise<boolean> {
  const { to, displayName, initialPassword } = params;
  return sendMail({
    to,
    subject: 'บัญชีผู้ใช้ใหม่ - OFM PROMPTGO',
    html: `
              <p>สวัสดีครับ/ค่ะ คุณ ${displayName}</p>
              <p>ได้มีการสร้างบัญชีผู้ใช้ให้คุณในระบบ OFM PROMPTGO แล้ว</p>
              <p><strong>อีเมล:</strong> ${to}</p>
              <p><strong>รหัสผ่านเริ่มต้น:</strong> ${initialPassword}</p>
              <p>เพื่อความปลอดภัย กรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่านที่หน้าข้อมูลส่วนตัวทันที</p>
              <p>— OFM PROMPTGO</p>
            `,
    text: `สวัสดี คุณ ${displayName}\nบัญชีของคุณใน OFM PROMPTGO ถูกสร้างแล้ว\nอีเมล: ${to}\nรหัสผ่านเริ่มต้น: ${initialPassword}\nกรุณาเปลี่ยนรหัสผ่านในข้อมูลส่วนตัวทันที`,
  });
}
