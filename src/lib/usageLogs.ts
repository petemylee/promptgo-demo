import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import type { UsageLogAction, Role } from '@prisma/client';

export type UsageLogCreateInput = {
  action: UsageLogAction;
  path: string;
  entityType?: string | null;
  entityId?: string | null;
  message?: string | null;
};

export async function requireAdminOrExecutiveSession() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as Role | undefined;
  if (!session?.user?.id || (role !== 'Admin' && role !== 'Executive')) {
    return { ok: false as const, session: null };
  }
  return { ok: true as const, session };
}

export async function writeUsageLog(input: UsageLogCreateInput & { userId?: string | null; role?: Role | null }) {
  const safePath = input.path?.slice(0, 500) || '/';
  const safeMsg = input.message ? String(input.message).slice(0, 1000) : null;
  const safeEntityType = input.entityType ? String(input.entityType).slice(0, 100) : null;
  const safeEntityId = input.entityId ? String(input.entityId).slice(0, 100) : null;

  try {
    await prisma.usageLog.create({
      data: {
        action: input.action,
        path: safePath,
        userId: input.userId ?? null,
        role: input.role ?? null,
        entityType: safeEntityType,
        entityId: safeEntityId,
        message: safeMsg,
      },
    });
  } catch (e) {
    // best-effort logging; never break primary request
    console.error('writeUsageLog failed', e);
  }
}

