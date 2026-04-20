import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

type SuggestionRow = { value: string; count: number };

function mapRows(rows: unknown): SuggestionRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => {
      const row = r as { value: string | null; count: number | bigint | null };
      const value = row.value?.trim() ?? '';
      if (!value) return null;
      const count = typeof row.count === 'bigint' ? Number(row.count) : Number(row.count ?? 0);
      return { value, count: Number.isFinite(count) ? count : 0 };
    })
    .filter((x): x is SuggestionRow => x !== null);
}

/** สถานที่ต้นทาง/ปลายทางที่เคยใช้ในคำขอ เรียงตามความถี่ */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'Requester' && role !== 'Admin' && role !== 'Executive') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [startRows, endRows] = await Promise.all([
      prisma.$queryRaw<SuggestionRow[]>`
        SELECT TRIM("startLocation") AS value, COUNT(*)::int AS count
        FROM "Booking"
        WHERE "startLocation" IS NOT NULL AND TRIM("startLocation") <> ''
        GROUP BY TRIM("startLocation")
        ORDER BY COUNT(*) DESC, TRIM("startLocation") ASC
        LIMIT 100
      `,
      prisma.$queryRaw<SuggestionRow[]>`
        SELECT TRIM("endLocation") AS value, COUNT(*)::int AS count
        FROM "Booking"
        WHERE "endLocation" IS NOT NULL AND TRIM("endLocation") <> ''
        GROUP BY TRIM("endLocation")
        ORDER BY COUNT(*) DESC, TRIM("endLocation") ASC
        LIMIT 100
      `,
    ]);

    return NextResponse.json({
      startLocation: mapRows(startRows),
      endLocation: mapRows(endRows),
    });
  } catch (e) {
    console.error('location-suggestions:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
