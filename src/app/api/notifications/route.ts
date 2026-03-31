import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get('limit');
  const cursor = url.searchParams.get('cursor');
  const includeArchived = url.searchParams.get('includeArchived') === 'true';

  const limit = Math.max(1, Math.min(50, limitRaw ? Number(limitRaw) : 20));

  const where = {
    userId: session.user.id,
    ...(includeArchived ? {} : { archivedAt: null as Date | null }),
  };

  const items = await prisma.notification.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

  return NextResponse.json({
    items: page.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      href: n.href,
      severity: n.severity,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    })),
    nextCursor,
  });
}

