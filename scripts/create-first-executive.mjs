/**
 * สร้างผู้ใช้ role Executive คนแรก (bootstrap หลัง migrate บนฐานข้อมูลว่าง)
 *
 * ข้อกำหนด:
 * - ตั้ง DATABASE_URL ใน environment (หรือใช้ .env ผ่าน shell ของ Next — สคริปต์นี้ไม่โหลด .env อัตโนมัติ)
 *
 * การใช้งาน:
 *   DATABASE_URL="postgresql://..." node scripts/create-first-executive.mjs <email> <password> [name] [position]
 *
 * Windows PowerShell:
 *   $env:DATABASE_URL="postgresql://..."; node scripts/create-first-executive.mjs exec@example.com 'YourSecurePass' 'ชื่อ' 'ตำแหน่ง'
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const email = process.argv[2]?.trim().toLowerCase();
const password = process.argv[3];
const name = process.argv[4]?.trim() || 'Executive';
const position = process.argv[5]?.trim() || 'ผู้บริหาร';

async function main() {
  if (!email || !password) {
    console.error('Usage: node scripts/create-first-executive.mjs <email> <password> [name] [position]');
    console.error('Or: npm run bootstrap:executive -- <email> <password> [name] [position]');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL. Set it in the environment before running this script.');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  const execCount = await prisma.user.count({ where: { role: 'Executive' } });
  if (execCount > 0) {
    const one = await prisma.user.findFirst({
      where: { role: 'Executive' },
      select: { email: true },
    });
    console.error(
      `There is already at least one Executive user (e.g. ${one?.email}). Refusing to create another via bootstrap.`
    );
    console.error('Create additional users from the app (Admin/Executive user management) or adjust this script.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`Email already in use: ${email}. Use a different email or change role in the database.`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'Executive',
      name,
      position,
      isActive: true,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  console.log('Created first Executive user:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
