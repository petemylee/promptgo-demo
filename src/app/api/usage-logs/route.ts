import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { writeUsageLog } from '@/lib/usageLogs';
import type { Role, UsageLogAction } from '@prisma/client';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as Role | undefined;
  if (!session?.user?.id || (role !== 'Admin' && role !== 'Executive')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const take = Math.min(Math.max(parseInt(url.searchParams.get('take') ?? '50', 10) || 50, 1), 200);
  const cursor = url.searchParams.get('cursor');
  const action = url.searchParams.get('action') as UsageLogAction | null;
  const path = url.searchParams.get('path');
  const userQuery = url.searchParams.get('user');

  const where = {
    ...(action ? { action } : {}),
    ...(path ? { path: { contains: path, mode: 'insensitive' as const } } : {}),
    ...(userQuery
      ? {
          user: {
            OR: [
              { name: { contains: userQuery, mode: 'insensitive' as const } },
              { email: { contains: userQuery, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  };

  const logs = await prisma.usageLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      action: true,
      path: true,
      entityType: true,
      entityId: true,
      message: true,
      role: true,
      user: { select: { id: true, name: true, email: true, role: true, position: true } },
    },
  });

  const hasMore = logs.length > take;
  const items = hasMore ? logs.slice(0, take) : logs;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  await writeUsageLog({
    action: 'API_CALL',
    path: '/api/usage-logs',
    userId: session.user.id,
    role,
    message: 'เปิดหน้าดูประวัติการใช้งาน',
    entityType: null,
    entityId: null,
  });

  return NextResponse.json({ items, nextCursor });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const role = session.user.role as Role | undefined;
  const bodyRecord = typeof body === 'object' && body !== null ? body as Record<string, unknown> : null;
  const action = (bodyRecord?.action as UsageLogAction | undefined) ?? 'PAGE_VIEW';
  const path = typeof bodyRecord?.path === 'string' ? bodyRecord.path : new URL(req.url).pathname;

  await writeUsageLog({
    action,
    path,
    userId: session.user.id,
    role: role ?? null,
    entityType: typeof bodyRecord?.entityType === 'string' ? bodyRecord.entityType : null,
    entityId: typeof bodyRecord?.entityId === 'string' ? bodyRecord.entityId : null,
    message: typeof bodyRecord?.message === 'string' ? bodyRecord.message : null,
  });

  return NextResponse.json({ ok: true });
}

