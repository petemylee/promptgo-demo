import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { enumerateUtcDays, formatUtcDayKey, getUtcRange, parseRangePreset } from '@/lib/utcRange';

const BOOKING_STATUSES = [
  'PENDING',
  'APPROVED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'MERGED',
] as const;

type BookingStatus = (typeof BOOKING_STATUSES)[number];

type StatusTrendItem = { day: string } & Record<BookingStatus, number>;

function emptyTrendItem(day: string): StatusTrendItem {
  return BOOKING_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, { day } as StatusTrendItem);
}

function addCount(map: Map<string, number>, key: string, delta = 1) {
  map.set(key, (map.get(key) ?? 0) + delta);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const preset = parseRangePreset(url.searchParams.get('range'));
  const range = getUtcRange(preset);

  try {
    const requesterId = session.user.id;

    const bookings = await prisma.booking.findMany({
      where: {
        requesterId,
        createdAt: {
          gte: range.startInclusive,
          lt: range.endExclusive,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        startTime: true,
        endTime: true,
        startMileage: true,
        endMileage: true,
        startLocation: true,
        endLocation: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const statusCounts: Record<BookingStatus, number> = BOOKING_STATUSES.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<BookingStatus, number>);

    const trendMap = new Map<string, StatusTrendItem>();
    for (const day of enumerateUtcDays(range.startInclusive, range.endExclusive)) {
      const key = formatUtcDayKey(day);
      trendMap.set(key, emptyTrendItem(key));
    }

    const routeCounts = new Map<string, number>();
    const timeOfDayBuckets: Record<'0-5' | '6-11' | '12-17' | '18-23' | 'unknown', number> = {
      '0-5': 0,
      '6-11': 0,
      '12-17': 0,
      '18-23': 0,
      unknown: 0,
    };

    for (const b of bookings) {
      const status = (b.status as BookingStatus) ?? 'PENDING';
      if (statusCounts[status] !== undefined) {
        statusCounts[status] += 1;
      }

      const createdKey = formatUtcDayKey(new Date(b.createdAt));
      const trendItem = trendMap.get(createdKey);
      if (trendItem) {
        trendItem[status] = (trendItem[status] ?? 0) + 1;
      }

      const start = b.startLocation?.trim() || '-';
      const end = b.endLocation?.trim() || '-';
      addCount(routeCounts, `${start} → ${end}`, 1);

      if (b.startTime) {
        const hour = new Date(b.startTime).getUTCHours();
        if (hour <= 5) timeOfDayBuckets['0-5'] += 1;
        else if (hour <= 11) timeOfDayBuckets['6-11'] += 1;
        else if (hour <= 17) timeOfDayBuckets['12-17'] += 1;
        else timeOfDayBuckets['18-23'] += 1;
      } else {
        timeOfDayBuckets.unknown += 1;
      }
    }

    const completedForKm = await prisma.booking.findMany({
      where: {
        requesterId,
        status: 'COMPLETED',
        endTime: {
          gte: range.startInclusive,
          lt: range.endExclusive,
        },
      },
      select: { startMileage: true, endMileage: true },
    });

    let totalKm = 0;
    let kmTripsWithMileage = 0;
    let missingMileageTrips = 0;
    for (const b of completedForKm) {
      const hasMileage = b.startMileage !== null && b.endMileage !== null;
      if (!hasMileage) {
        missingMileageTrips += 1;
        continue;
      }
      const tripKm = Math.max(0, (b.endMileage as number) - (b.startMileage as number));
      totalKm += tripKm;
      kmTripsWithMileage += 1;
    }

    const topRoutes = Array.from(routeCounts.entries())
      .map(([route, tripCount]) => ({ route, tripCount }))
      .sort((a, b) => b.tripCount - a.tripCount)
      .slice(0, 10);

    const statusTrend = Array.from(trendMap.values());

    const feedbacks = await prisma.driverFeedback.findMany({
      where: {
        createdAt: { gte: range.startInclusive, lt: range.endExclusive },
        booking: { requesterId },
      },
      select: { rating: true },
    });

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    let ratingSum = 0;
    for (const f of feedbacks) {
      const r = Math.max(1, Math.min(5, f.rating)) as 1 | 2 | 3 | 4 | 5;
      ratingDistribution[r] += 1;
      ratingSum += r;
    }
    const avgRating = feedbacks.length ? Number((ratingSum / feedbacks.length).toFixed(2)) : 0;

    return NextResponse.json({
      statusCounts,
      statusTrend,
      kmSummary: {
        totalKm,
        avgKmPerTrip: kmTripsWithMileage ? Number((totalKm / kmTripsWithMileage).toFixed(2)) : 0,
        missingMileageTrips,
      },
      topRoutes,
      timeOfDayBuckets,
      driverQuality: {
        avgRating,
        ratingCount: feedbacks.length,
        ratingDistribution,
      },
      meta: {
        range: preset,
        startDate: range.startInclusive.toISOString(),
        endDate: range.endExclusive.toISOString(),
        timezone: range.timezone,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('GET /api/my/bookings/stats error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

