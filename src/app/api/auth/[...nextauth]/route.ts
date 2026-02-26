// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import LineProvider from 'next-auth/providers/line';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };