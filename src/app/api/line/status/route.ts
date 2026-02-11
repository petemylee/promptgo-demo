import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { lineUserId: true },
    });
    return NextResponse.json({
      linked: !!user?.lineUserId,
      lineUserId: user?.lineUserId ?? null,
    });
  } catch (error) {
    console.error('LINE status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
