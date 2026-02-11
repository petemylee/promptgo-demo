import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // ใช้ origin จาก request ให้ตรงกับ URL ที่ LINE redirect กลับมา (สำคัญบน Vercel)
  const baseUrl = url.origin;
  const redirectUri = `${baseUrl}/api/line/callback`;

  if (!code || !state) {
    const returnTo = state ? decodeStateReturnTo(state) : '/';
    return NextResponse.redirect(`${baseUrl}${returnTo}?line_linked=error&reason=missing_params`);
  }

  const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET || process.env.LINE_CHANNEL_SECRET;
  if (!channelId || !channelSecret) {
    const returnTo = decodeStateReturnTo(state);
    return NextResponse.redirect(`${baseUrl}${returnTo}?line_linked=error&reason=config`);
  }

  const [userId, returnToRaw] = decodeState(state);
  const returnTo = returnToRaw && returnToRaw.startsWith('/') ? returnToRaw : '/';

  try {
    const tokenRes = await fetch(LINE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('LINE token error:', tokenRes.status, err);
      return NextResponse.redirect(`${baseUrl}${returnTo}?line_linked=error&reason=token`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}${returnTo}?line_linked=error&reason=token`);
    }

    const profileRes = await fetch(LINE_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      console.error('LINE profile error:', profileRes.status);
      return NextResponse.redirect(`${baseUrl}${returnTo}?line_linked=error&reason=profile`);
    }

    const profile = (await profileRes.json()) as { userId?: string };
    const lineUserId = profile.userId;
    if (!lineUserId || typeof lineUserId !== 'string') {
      return NextResponse.redirect(`${baseUrl}${returnTo}?line_linked=error&reason=profile`);
    }

    const existing = await prisma.user.findFirst({ where: { lineUserId } });
    if (existing && existing.id !== userId) {
      return NextResponse.redirect(`${baseUrl}${returnTo}?line_linked=error&reason=already_used`);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lineUserId },
    });

    return NextResponse.redirect(`${baseUrl}${returnTo}?line_linked=success`);
  } catch (error) {
    console.error('LINE callback error:', error);
    return NextResponse.redirect(`${baseUrl}${returnTo}?line_linked=error&reason=server`);
  }
}

function decodeState(state: string): [userId: string, returnTo: string] {
  try {
    const decoded = decodeURIComponent(state);
    const sep = decoded.indexOf('|');
    if (sep === -1) return [decoded, '/'];
    return [decoded.slice(0, sep), decoded.slice(sep + 1) || '/'];
  } catch {
    return [state, '/'];
  }
}

function decodeStateReturnTo(state: string): string {
  const [, returnTo] = decodeState(state);
  return returnTo || '/';
}
