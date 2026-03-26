import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { Role } from '@prisma/client';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({ req });
  const role = token?.role as Role | undefined;

  const deny = () => {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  };

  // Protect areas by role (server-side)
  if (pathname.startsWith('/admin')) {
    if (role !== 'Admin') return deny();
  }
  if (pathname.startsWith('/executive')) {
    if (role !== 'Executive') return deny();
  }
  if (pathname.startsWith('/driver')) {
    if (role !== 'Driver') return deny();
  }
  if (pathname.startsWith('/requester')) {
    if (role !== 'Requester') return deny();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/executive/:path*', '/driver/:path*', '/requester/:path*'],
};

