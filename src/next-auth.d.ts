import type { DefaultSession, DefaultUser } from 'next-auth';
import { Role } from '@prisma/client';

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
