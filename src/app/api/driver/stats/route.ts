import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { enumerateUtcDays, formatUtcDayKey, getUtcRange, parseRangePreset } from '@/lib/utcRange';

type RangePreset = '7d' | '30d' | '90d' | 'ytd';

const JOB_STATUSES = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'APPROVED', 'PENDING', 'MERGED'] as const;
type JobStatus = (typeof JOB_STATUSES)[number];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'Driver') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const preset = parseRangePreset(url.searchParams.get('range')) as RangePreset;
  const range = getUtcRange(preset);

  try {
    const driverId = session.user.id;

    const jobs = await prisma.booking.findMany({
      where: {
        driverId,
        createdAt: { gte: range.startInclusive, lt: range.endExclusive },
      },
      select: {
        status: true,
        endLocation: true,
      },
    });

    const jobCounts: Record<JobStatus, number> = JOB_STATUSES.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<JobStatus, number>);

    const destinationCounts = new Map<string, number>();
    for (const job of jobs) {
      const status = (job.status as JobStatus) ?? 'CONFIRMED';
      if (jobCounts[status] !== undefined) {
        jobCounts[status] += 1;
      }
      const dest = job.endLocation?.trim();
      if (dest) {
        destinationCounts.set(dest, (destinationCounts.get(dest) ?? 0) + 1);
      }
    }

    const completed = await prisma.booking.findMany({
      where: {
        driverId,
        status: 'COMPLETED',
        endTime: { gte: range.startInclusive, lt: range.endExclusive },
      },
      select: {
        endTime: true,
        startTime: true,
        startMileage: true,
        endMileage: true,
      },
    });

    const completedTrendMap = new Map<string, number>();
    for (const day of enumerateUtcDays(range.startInclusive, range.endExclusive)) {
      completedTrendMap.set(formatUtcDayKey(day), 0);
    }
    for (const job of completed) {
      if (!job.endTime) continue;
      const key = formatUtcDayKey(new Date(job.endTime));
      completedTrendMap.set(key, (completedTrendMap.get(key) ?? 0) + 1);
    }
    const completedTrend = Array.from(completedTrendMap.entries()).map(([day, completedTrips]) => ({ day, completedTrips }));

    let totalKm = 0;
    let tripsWithMileage = 0;
    let missingMileageTrips = 0;

    let totalHours = 0;
    let tripsWithDuration = 0;
    let missingTimeTrips = 0;

    for (const job of completed) {
      const hasMileage = job.startMileage !== null && job.endMileage !== null;
      if (!hasMileage) {
        missingMileageTrips += 1;
      } else {
        const km = Math.max(0, (job.endMileage as number) - (job.startMileage as number));
        totalKm += km;
        tripsWithMileage += 1;
      }

      const hasTimes = !!job.startTime && !!job.endTime;
      if (!hasTimes) {
        missingTimeTrips += 1;
      } else {
        const ms = new Date(job.endTime as Date).getTime() - new Date(job.startTime as Date).getTime();
        const hours = Math.max(0, ms / (1000 * 60 * 60));
        totalHours += hours;
        tripsWithDuration += 1;
      }
    }

    const feedbacks = await prisma.driverFeedback.findMany({
      where: { driverId, createdAt: { gte: range.startInclusive, lt: range.endExclusive } },
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

    const topDestinations = Array.from(destinationCounts.entries())
      .map(([destination, tripCount]) => ({ destination, tripCount }))
      .sort((a, b) => b.tripCount - a.tripCount)
      .slice(0, 10);

    return NextResponse.json({
      jobCounts,
      completedTrend,
      kmSummary: {
        totalKm,
        avgKmPerTrip: tripsWithMileage ? Number((totalKm / tripsWithMileage).toFixed(2)) : 0,
        missingMileageTrips,
      },
      hoursSummary: {
        totalHours: Number(totalHours.toFixed(2)),
        avgHoursPerTrip: tripsWithDuration ? Number((totalHours / tripsWithDuration).toFixed(2)) : 0,
        missingTimeTrips,
      },
      feedbackSummary: {
        avgRating,
        ratingCount: feedbacks.length,
        ratingDistribution,
      },
      topDestinations,
      meta: {
        range: preset,
        startDate: range.startInclusive.toISOString(),
        endDate: range.endExclusive.toISOString(),
        timezone: range.timezone,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('GET /api/driver/stats error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

