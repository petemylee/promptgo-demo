// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** ต้อง reuse instance เดียวเสมอ (รวม production) — ไม่งั้นแต่ละ import สร้าง pool ใหม่แล้วชน connection limit */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

