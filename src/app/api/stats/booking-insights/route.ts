import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getUtcRange, parseRangePreset } from '@/lib/utcRange';

const TRIP_STATUSES = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as const;

type RangePreset = '7d' | '30d' | '90d' | 'ytd';

function clampTopN<T>(items: T[], n: number) {
  return items.length > n ? items.slice(0, n) : items;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'Admin' && session.user.role !== 'Executive') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const preset = parseRangePreset(url.searchParams.get('range')) as RangePreset;
  const range = getUtcRange(preset);

  try {
    const trips = await prisma.booking.findMany({
      where: {
        status: { in: [...TRIP_STATUSES] },
        startTime: {
          gte: range.startInclusive,
          lt: range.endExclusive,
        },
      },
      select: {
        startTime: true,
        startLocation: true,
        endLocation: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const routeCounts = new Map<string, number>();
    const heatmapCounts = new Map<string, number>(); // `${dow}-${hour}` -> count

    for (const t of trips) {
      const start = t.startLocation?.trim() || '-';
      const end = t.endLocation?.trim() || '-';
      const route = `${start} → ${end}`;
      routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);

      const dt = t.startTime ? new Date(t.startTime) : null;
      if (!dt) continue;
      const dow = dt.getUTCDay(); // 0=Sun..6=Sat
      const hour = dt.getUTCHours(); // 0..23
      const key = `${dow}-${hour}`;
      heatmapCounts.set(key, (heatmapCounts.get(key) ?? 0) + 1);
    }

    const topRoutes = clampTopN(
      Array.from(routeCounts.entries())
        .map(([route, tripCount]) => ({ route, tripCount }))
        .sort((a, b) => b.tripCount - a.tripCount),
      10,
    );

    const heatmap: Array<{ dow: number; hour: number; count: number }> = [];
    for (let dow = 0; dow <= 6; dow += 1) {
      for (let hour = 0; hour <= 23; hour += 1) {
        const key = `${dow}-${hour}`;
        heatmap.push({ dow, hour, count: heatmapCounts.get(key) ?? 0 });
      }
    }

    return NextResponse.json({
      topRoutes,
      heatmap,
      meta: {
        range: preset,
        startDate: range.startInclusive.toISOString(),
        endDate: range.endExclusive.toISOString(),
        timezone: range.timezone,
        generatedAt: new Date().toISOString(),
        source: {
          statuses: TRIP_STATUSES,
          timeField: 'startTime',
        },
      },
    });
  } catch (err) {
    console.error('GET /api/stats/booking-insights error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

