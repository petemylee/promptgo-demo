import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, readAt: null, archivedAt: null },
  });

  return NextResponse.json({ unreadCount });
}

