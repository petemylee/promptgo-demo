// src/types/next-auth.d.ts หรือ src/next-auth.d.ts
import type { DefaultSession, DefaultUser } from 'next-auth';
import { Role } from '@prisma/client'; // Import Role enum จาก Prisma

// ขยาย Type ของ User เพื่อรวม 'role'
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      position?: string | null;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: Role;
    position?: string | null;
  }
}

// ขยาย Type ของ JWT เพื่อรวม 'role' และ 'id'
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    position?: string | null;
  }
}