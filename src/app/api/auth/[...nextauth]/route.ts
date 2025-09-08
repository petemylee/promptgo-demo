// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    // Callback นี้จะถูกเรียกเมื่อ JWT ถูกสร้างหรืออัปเดต
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role; // เพิ่ม role เข้าไปใน token
      }
      return token;
    },
    // Callback นี้จะถูกเรียกเมื่อ Session ถูกเข้าถึง
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role; // เพิ่ม role เข้าไปใน session
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