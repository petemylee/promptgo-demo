import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

/** ดึงค่าที่เคยบันทึกในระบบ เรียงตามจำนวนรถที่ใช้ค่านั้น (มากไปน้อย) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && session?.user?.role !== 'Executive') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [brandRows, colorRows, modelRows, typeRows] = await Promise.all([
      prisma.$queryRaw<SuggestionRow[]>`
        SELECT TRIM(brand) AS value, COUNT(*)::int AS count
        FROM "Vehicle"
        WHERE brand IS NOT NULL AND TRIM(brand) <> ''
        GROUP BY TRIM(brand)
        ORDER BY COUNT(*) DESC, TRIM(brand) ASC
        LIMIT 100
      `,
      prisma.$queryRaw<SuggestionRow[]>`
        SELECT TRIM(color) AS value, COUNT(*)::int AS count
        FROM "Vehicle"
        WHERE color IS NOT NULL AND TRIM(color) <> ''
        GROUP BY TRIM(color)
        ORDER BY COUNT(*) DESC, TRIM(color) ASC
        LIMIT 100
      `,
      prisma.$queryRaw<SuggestionRow[]>`
        SELECT TRIM(model) AS value, COUNT(*)::int AS count
        FROM "Vehicle"
        WHERE model IS NOT NULL AND TRIM(model) <> ''
        GROUP BY TRIM(model)
        ORDER BY COUNT(*) DESC, TRIM(model) ASC
        LIMIT 100
      `,
      prisma.$queryRaw<SuggestionRow[]>`
        SELECT TRIM(type) AS value, COUNT(*)::int AS count
        FROM "Vehicle"
        WHERE type IS NOT NULL AND TRIM(type) <> ''
        GROUP BY TRIM(type)
        ORDER BY COUNT(*) DESC, TRIM(type) ASC
        LIMIT 100
      `,
    ]);

    return NextResponse.json({
      brand: mapRows(brandRows),
      color: mapRows(colorRows),
      model: mapRows(modelRows),
      type: mapRows(typeRows),
    });
  } catch (e) {
    console.error('field-suggestions:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
