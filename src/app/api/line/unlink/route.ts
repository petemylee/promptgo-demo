import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id as string;
  try {
    await prisma.$transaction([
      prisma.account.deleteMany({ where: { userId, provider: 'line' } }),
      prisma.user.update({
        where: { id: userId },
        data: { lineUserId: null },
      }),
    ]);
    return NextResponse.json({ success: true, linked: false });
  } catch (error) {
    console.error('LINE unlink error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
