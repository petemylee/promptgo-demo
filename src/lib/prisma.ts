import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildDatasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  // Allow overriding via env without forcing URL changes everywhere
  const defaultConnectionLimit = process.env.PRISMA_CONNECTION_LIMIT ?? '1';
  const defaultPoolTimeout = process.env.PRISMA_POOL_TIMEOUT ?? '30';

  try {
    // Prisma supports query params like `connection_limit` and `pool_timeout` for PostgreSQL URLs.
    // We only apply defaults if the user didn't already set them.
    const u = new URL(raw);
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', defaultConnectionLimit);
    }
    if (!u.searchParams.has('pool_timeout')) {
      u.searchParams.set('pool_timeout', defaultPoolTimeout);
    }
    return u.toString();
  } catch {
    // If URL parsing fails, fall back to raw string.
    return raw;
  }
}

/** ต้อง reuse instance เดียวเสมอ (รวม production) — ไม่งั้นแต่ละ import สร้าง pool ใหม่แล้วชน connection limit */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: buildDatasourceUrl(),
      },
    },
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

