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
  const userId = url.searchParams.get('userId');
  const path = url.searchParams.get('path');

  const where = {
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
    ...(path ? { path: { contains: path, mode: 'insensitive' as const } } : {}),
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

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const role = session.user.role as Role | undefined;
  const action = (body?.action as UsageLogAction | undefined) ?? 'PAGE_VIEW';
  const path = typeof body?.path === 'string' ? body.path : new URL(req.url).pathname;

  await writeUsageLog({
    action,
    path,
    userId: session.user.id,
    role: role ?? null,
    entityType: typeof body?.entityType === 'string' ? body.entityType : null,
    entityId: typeof body?.entityId === 'string' ? body.entityId : null,
    message: typeof body?.message === 'string' ? body.message : null,
  });

  return NextResponse.json({ ok: true });
}

