// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { writeUsageLog } from '@/lib/usageLogs';
import { randomInitialPassword, sendNewUserWelcomeEmail } from '@/lib/newUserWelcome';
import type { Role as PrismaRole } from '@prisma/client';

type SessionLike = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
} | null;

function actorName(session: SessionLike) {
  return session?.user?.name || session?.user?.email || session?.user?.id || 'ไม่ทราบชื่อ';
}

const VALID_ROLES = new Set(['Requester', 'Driver', 'Admin', 'Executive']);

// GET: ดึงข้อมูลผู้ใช้ทั้งหมด
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Executive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        phoneNumber: true,
        profileImageUrl: true,
        signatureImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: สร้างผู้ใช้ใหม่
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Executive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const isBulkImport = body?.mode === 'bulkImport' && Array.isArray(body?.users);

    if (isBulkImport) {
      type BulkUserInput = {
        rowNumber?: number;
        name?: string;
        email?: string;
        role?: string;
        position?: string;
        phoneNumber?: string;
      };
      const importUsers = body.users as BulkUserInput[];
      if (importUsers.length === 0) {
        return NextResponse.json({ error: 'No users to import' }, { status: 400 });
      }

      const normalized = importUsers.map((item, index) => {
        const name = (item?.name || '').trim();
        const email = (item?.email || '').trim().toLowerCase();
        const role = (item?.role || '').trim();
        const position = (item?.position || '').trim();
        const phoneNumber = item?.phoneNumber?.trim() || null;
        const rowNumber = typeof item?.rowNumber === 'number' ? item.rowNumber : index + 1;
        return { index, rowNumber, name, email, role, position, phoneNumber };
      });

      const candidateEmails = Array.from(
        new Set(normalized.map((u) => u.email).filter((email) => email.length > 0))
      );
      const existingUsers = candidateEmails.length
        ? await prisma.user.findMany({
            where: { email: { in: candidateEmails } },
            select: { email: true },
          })
        : [];
      const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));
      const fileDuplicateSeen = new Set<string>();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const results: Array<{
        rowNumber: number;
        name: string;
        email: string;
        role: string;
        status: 'created' | 'skipped' | 'failed';
        reason?: string;
        userId?: string;
        emailSent?: boolean;
      }> = [];

      for (const item of normalized) {
        if (!item.name || !item.email || !item.position || !item.role) {
          results.push({
            rowNumber: item.rowNumber,
            name: item.name,
            email: item.email,
            role: item.role,
            status: 'failed',
            reason: 'Missing required fields',
          });
          continue;
        }
        if (!emailRegex.test(item.email)) {
          results.push({
            rowNumber: item.rowNumber,
            name: item.name,
            email: item.email,
            role: item.role,
            status: 'failed',
            reason: 'Invalid email format',
          });
          continue;
        }
        if (!VALID_ROLES.has(item.role)) {
          results.push({
            rowNumber: item.rowNumber,
            name: item.name,
            email: item.email,
            role: item.role,
            status: 'failed',
            reason: 'Invalid role',
          });
          continue;
        }
        if (fileDuplicateSeen.has(item.email)) {
          results.push({
            rowNumber: item.rowNumber,
            name: item.name,
            email: item.email,
            role: item.role,
            status: 'skipped',
            reason: 'Duplicate email in uploaded file',
          });
          continue;
        }
        fileDuplicateSeen.add(item.email);

        if (existingEmailSet.has(item.email)) {
          results.push({
            rowNumber: item.rowNumber,
            name: item.name,
            email: item.email,
            role: item.role,
            status: 'skipped',
            reason: 'Email already exists',
          });
          continue;
        }

        try {
          const initialPassword = randomInitialPassword(12);
          const hashedPassword = await bcrypt.hash(initialPassword, 10);
          const created = await prisma.user.create({
            data: {
              name: item.name,
              email: item.email,
              password: hashedPassword,
              role: item.role as PrismaRole,
              position: item.position,
              phoneNumber: item.phoneNumber,
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          });
          existingEmailSet.add(item.email);

          const emailSent = await sendNewUserWelcomeEmail({
            to: item.email,
            displayName: created.name || item.name,
            initialPassword,
          });

          results.push({
            rowNumber: item.rowNumber,
            name: item.name,
            email: item.email,
            role: item.role,
            status: 'created',
            userId: created.id,
            emailSent,
            reason: emailSent ? undefined : 'Created but failed to send email',
          });
        } catch (error: unknown) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code?: string }).code === 'P2002'
          ) {
            results.push({
              rowNumber: item.rowNumber,
              name: item.name,
              email: item.email,
              role: item.role,
              status: 'skipped',
              reason: 'Email already exists',
            });
          } else {
            results.push({
              rowNumber: item.rowNumber,
              name: item.name,
              email: item.email,
              role: item.role,
              status: 'failed',
              reason: 'Failed to create user',
            });
          }
        }
      }

      const createdCount = results.filter((r) => r.status === 'created').length;
      const skippedCount = results.filter((r) => r.status === 'skipped').length;
      const failedCount = results.filter((r) => r.status === 'failed').length;

      await writeUsageLog({
        action: 'CREATE',
        path: '/admin/users',
        userId: session.user.id,
        role: session.user.role as PrismaRole,
        entityType: 'User',
        message: `${session.user.role === 'Executive' ? 'ผู้บริหาร' : 'แอดมิน'} ${actorName(session)} import ผู้ใช้ ${createdCount} รายการ (ข้าม ${skippedCount}, ล้มเหลว ${failedCount})`,
      });

      return NextResponse.json(
        {
          summary: {
            total: results.length,
            created: createdCount,
            skipped: skippedCount,
            failed: failedCount,
          },
          results,
        },
        { status: 200 }
      );
    }

    const { name, email, role, position, phoneNumber } = body;

    if (!name || !email || !role || !position) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedRole = String(role).trim();
    const trimmedPosition = String(position).trim();

    if (!VALID_ROLES.has(trimmedRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const initialPassword = randomInitialPassword(12);
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          password: hashedPassword,
          role: trimmedRole as PrismaRole,
          position: trimmedPosition,
          phoneNumber: phoneNumber?.trim() || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          position: true,
          phoneNumber: true,
          profileImageUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        return NextResponse.json({ error: 'อีเมลนี้มีในระบบแล้ว' }, { status: 409 });
      }
      throw error;
    }

    const emailSent = await sendNewUserWelcomeEmail({
      to: normalizedEmail,
      displayName: newUser.name || trimmedName,
      initialPassword,
    });

    const actor = actorName(session);
    const target = newUser.name || newUser.email;
    await writeUsageLog({
      action: 'CREATE',
      path: '/admin/users',
      userId: session.user.id,
      role: session.user.role as PrismaRole,
      entityType: 'User',
      entityId: newUser.id,
      message: `${session.user.role === 'Executive' ? 'ผู้บริหาร' : 'แอดมิน'} ${actor} สร้างผู้ใช้ใหม่ ${target}`,
    });

    return NextResponse.json({ ...newUser, emailSent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}