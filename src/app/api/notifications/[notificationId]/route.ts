import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { publishNotificationToUser } from '@/lib/notificationsStream';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ notificationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { notificationId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const markRead = body?.read === true;
  const archive = body?.archived === true;

  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, readAt: true, archivedAt: true },
  });

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      ...(markRead && !existing.readAt ? { readAt: new Date() } : {}),
      ...(archive && !existing.archivedAt ? { archivedAt: new Date() } : {}),
    },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, readAt: null, archivedAt: null },
  });
  publishNotificationToUser(session.user.id, {
    event: 'unread_count',
    data: { unreadCount },
  });

  return NextResponse.json(updated);
}

