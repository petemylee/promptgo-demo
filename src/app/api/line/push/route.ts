import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { sendLineMessage } from '@/lib/line';

const MAX_TEXT = 5000;

function verifyBearerSecret(req: NextRequest): boolean {
  const secret = process.env.LINE_PUSH_API_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  if (token.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

async function resolveLineUserId(body: {
  lineUserId?: string;
  userId?: string;
}): Promise<{ lineUserId: string } | { error: string; status: number }> {
  if (body.lineUserId && typeof body.lineUserId === 'string' && body.lineUserId.trim()) {
    return { lineUserId: body.lineUserId.trim() };
  }
  if (body.userId && typeof body.userId === 'string' && body.userId.trim()) {
    const user = await prisma.user.findUnique({
      where: { id: body.userId.trim() },
      select: { lineUserId: true },
    });
    if (!user?.lineUserId) {
      return { error: 'User not found or LINE not linked', status: 404 };
    }
    return { lineUserId: user.lineUserId };
  }
  return { error: 'Provide lineUserId or userId', status: 400 };
}

/**
 * Push ข้อความผ่าน LINE Messaging API (push message)
 *
 * อนุญาตเมื่อ:
 * - Header `Authorization: Bearer <LINE_PUSH_API_SECRET>` (ตั้งค่าใน env ก่อน)
 * - หรือผู้ใช้ล็อกอินเป็น Admin
 *
 * Body JSON: { "message": "...", "lineUserId": "..." } หรือ { "message": "...", "userId": "<cuid ในระบบ>" }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const bearerOk = verifyBearerSecret(req);
  const adminOk = session?.user?.role === 'Admin';

  if (!bearerOk && !adminOk) {
    return NextResponse.json(
      { error: 'Unauthorized — use Admin session or Authorization: Bearer LINE_PUSH_API_SECRET' },
      { status: 401 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const body = json as { message?: unknown; lineUserId?: unknown; userId?: unknown };
  const message =
    typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (message.length > MAX_TEXT) {
    return NextResponse.json(
      { error: `message too long (max ${MAX_TEXT} characters)` },
      { status: 400 }
    );
  }

  const resolved = await resolveLineUserId({
    lineUserId: typeof body.lineUserId === 'string' ? body.lineUserId : undefined,
    userId: typeof body.userId === 'string' ? body.userId : undefined,
  });
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const ok = await sendLineMessage(resolved.lineUserId, message);
  if (!ok) {
    return NextResponse.json(
      { error: 'Failed to send (check LINE_CHANNEL_ACCESS_TOKEN and user id)' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
