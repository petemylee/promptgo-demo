import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import type {
  TravelStatsDriverJobsItem,
  TravelStatsResponse,
  TravelStatsVehicleJobsItem,
  TravelStatsVehicleKmItem,
} from '@/types/travelStats';

function getMonthRange(monthParam: string | null) {
  const now = new Date();
  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const value = monthParam ?? fallbackMonth;

  if (!/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearRaw, monthRaw] = value.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));

  return { value, startDate, endDate };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'Admin' && session.user.role !== 'Executive') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const monthParam = new URL(req.url).searchParams.get('month');
  const monthRange = getMonthRange(monthParam);
  if (!monthRange) {
    return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        endTime: {
          gte: monthRange.startDate,
          lt: monthRange.endDate,
        },
      },
      select: {
        id: true,
        startMileage: true,
        endMileage: true,
        vehicleId: true,
        driverId: true,
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    let totalKm = 0;
    let missingMileageTrips = 0;
    const vehicleKmMap = new Map<string, TravelStatsVehicleKmItem>();
    const vehicleJobsMap = new Map<string, TravelStatsVehicleJobsItem>();
    const driverJobsMap = new Map<string, TravelStatsDriverJobsItem>();
    const activeVehicleIds = new Set<string>();
    const activeDriverIds = new Set<string>();

    for (const booking of bookings) {
      const hasMileage = booking.startMileage !== null && booking.endMileage !== null;
      const tripKm = hasMileage
        ? Math.max(0, (booking.endMileage as number) - (booking.startMileage as number))
        : 0;

      if (!hasMileage) {
        missingMileageTrips += 1;
      } else {
        totalKm += tripKm;
      }

      if (booking.vehicleId && booking.vehicle) {
        activeVehicleIds.add(booking.vehicleId);
        const vehicleKey = booking.vehicleId;
        const currentKm = vehicleKmMap.get(vehicleKey);
        if (currentKm) {
          currentKm.tripCount += 1;
          currentKm.totalKm += tripKm;
        } else {
          vehicleKmMap.set(vehicleKey, {
            vehicleId: booking.vehicleId,
            licensePlate: booking.vehicle.licensePlate,
            tripCount: 1,
            totalKm: tripKm,
          });
        }

        const currentJobCount = vehicleJobsMap.get(vehicleKey);
        if (currentJobCount) {
          currentJobCount.tripCount += 1;
        } else {
          vehicleJobsMap.set(vehicleKey, {
            vehicleId: booking.vehicleId,
            licensePlate: booking.vehicle.licensePlate,
            tripCount: 1,
          });
        }
      }

      if (booking.driverId && booking.driver) {
        activeDriverIds.add(booking.driverId);
        const driverKey = booking.driverId;
        const currentDriver = driverJobsMap.get(driverKey);
        if (currentDriver) {
          currentDriver.tripCount += 1;
          currentDriver.totalKm += tripKm;
        } else {
          driverJobsMap.set(driverKey, {
            driverId: booking.driverId,
            driverName: booking.driver.name || booking.driver.email,
            tripCount: 1,
            totalKm: tripKm,
          });
        }
      }
    }

    const response: TravelStatsResponse = {
      summary: {
        totalKm,
        completedTrips: bookings.length,
        activeVehicles: activeVehicleIds.size,
        activeDrivers: activeDriverIds.size,
        avgKmPerTrip: bookings.length > 0 ? Number((totalKm / bookings.length).toFixed(2)) : 0,
      },
      byVehicleKm: Array.from(vehicleKmMap.values()).sort((a, b) => b.totalKm - a.totalKm),
      byVehicleJobs: Array.from(vehicleJobsMap.values()).sort((a, b) => b.tripCount - a.tripCount),
      byDriverJobs: Array.from(driverJobsMap.values()).sort((a, b) => b.tripCount - a.tripCount),
      meta: {
        month: monthRange.value,
        startDate: monthRange.startDate.toISOString(),
        endDate: monthRange.endDate.toISOString(),
        timezone: 'UTC',
        generatedAt: new Date().toISOString(),
        missingMileageTrips,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching travel stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
