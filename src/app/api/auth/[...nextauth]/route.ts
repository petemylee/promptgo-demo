// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import LineProvider from 'next-auth/providers/line';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

const SESSION_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60; // 30 วัน (วินาที)
const SESSION_MAX_AGE_DEFAULT = 24 * 60 * 60; // 1 วัน

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember me', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return user;
      },
    }),
    LineProvider({
      clientId: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID ?? '',
      clientSecret: process.env.LINE_LOGIN_CHANNEL_SECRET ?? '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    signIn: async ({ account, profile }) => {
      const p = profile as { id?: string; sub?: string } | null;
      const lineId = p?.id ?? p?.sub;
      if (account?.provider === 'line' && lineId) {
        const linked = await prisma.user.findFirst({
          where: { lineUserId: lineId },
        });
        if (!linked) {
          return '/login?error=LineNotLinked';
        }
        return true;
      }
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.position = (user as { position?: string | null }).position ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.position = token.position ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // ต้องสร้าง NEXTAUTH_SECRET ใน .env
  pages: {
    signIn: '/login', // บอก NextAuth ว่าหน้า Login ของเราอยู่ที่ไหน
  },
};

async function getRememberMeFromRequest(req: Request): Promise<string | null> {
  if (req.method !== 'POST') return null;
  const contentType = req.headers.get('content-type') ?? '';
  try {
    const clone = req.clone();
    if (contentType.includes('application/json')) {
      const body = await clone.json();
      const raw = body?.rememberMe ?? body?.credentials?.rememberMe ?? null;
      return raw != null ? String(raw) : null;
    }
    const form = await clone.formData();
    const raw = form.get('rememberMe');
    return raw != null ? String(raw) : null;
  } catch {
    return null;
  }
}

function createHandler(sessionMaxAge: number) {
  return NextAuth({
    ...authOptions,
    session: { strategy: 'jwt', maxAge: sessionMaxAge },
  });
}

export async function GET(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  const maxAge = SESSION_MAX_AGE_DEFAULT;
  return createHandler(maxAge)(req as unknown as Request & { nextUrl?: URL }, context);
}

export async function POST(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  const rememberMe = await getRememberMeFromRequest(req);
  const maxAge = rememberMe === 'true' ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
  return createHandler(maxAge)(req as unknown as Request & { nextUrl?: URL }, context);
}