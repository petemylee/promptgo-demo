import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { publishNotificationToUser } from '@/lib/notificationsStream';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null, archivedAt: null },
    data: { readAt: new Date() },
  });

  publishNotificationToUser(session.user.id, {
    event: 'unread_count',
    data: { unreadCount: 0 },
  });

  return NextResponse.json({ ok: true });
}

