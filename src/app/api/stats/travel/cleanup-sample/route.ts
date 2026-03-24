import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

const SAMPLE_NOTE = 'generated-sample-travel-stats';
const SAMPLE_PURPOSE = 'ข้อมูลทดสอบสถิติการเดินทาง';
const SAMPLE_DRIVER_EMAIL_PREFIX = 'sample-travel-driver-';
const SAMPLE_DRIVER_EMAIL_DOMAIN = 'local.test';
const SAMPLE_VEHICLE_PLATE_PREFIX = 'TS-TEST-';

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'Admin' && session.user.role !== 'Executive') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const monthRange = getMonthRange(body.month ?? null);
    if (!monthRange) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    const deleteResult = await prisma.booking.deleteMany({
      where: {
        status: 'COMPLETED',
        additionalNotes: SAMPLE_NOTE,
        purpose: SAMPLE_PURPOSE,
        endTime: {
          gte: monthRange.startDate,
          lt: monthRange.endDate,
        },
      },
    });

    const [sampleDrivers, sampleVehicles] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'Driver',
          email: {
            startsWith: SAMPLE_DRIVER_EMAIL_PREFIX,
            endsWith: `@${SAMPLE_DRIVER_EMAIL_DOMAIN}`,
          },
        },
        select: { id: true },
      }),
      prisma.vehicle.findMany({
        where: {
          licensePlate: { startsWith: SAMPLE_VEHICLE_PLATE_PREFIX },
        },
        select: { id: true },
      }),
    ]);

    const sampleDriverIds = sampleDrivers.map((driver) => driver.id);
    const sampleVehicleIds = sampleVehicles.map((vehicle) => vehicle.id);

    let deletedSampleDrivers = 0;
    let deletedSampleVehicles = 0;

    if (sampleDriverIds.length > 0) {
      const inUseDriverBookings = await prisma.booking.count({
        where: { driverId: { in: sampleDriverIds } },
      });
      if (inUseDriverBookings === 0) {
        const deleted = await prisma.user.deleteMany({
          where: { id: { in: sampleDriverIds } },
        });
        deletedSampleDrivers = deleted.count;
      }
    }

    if (sampleVehicleIds.length > 0) {
      const inUseVehicleBookings = await prisma.booking.count({
        where: { vehicleId: { in: sampleVehicleIds } },
      });
      if (inUseVehicleBookings === 0) {
        const deleted = await prisma.vehicle.deleteMany({
          where: { id: { in: sampleVehicleIds } },
        });
        deletedSampleVehicles = deleted.count;
      }
    }

    return NextResponse.json({
      message: 'Sample travel data cleaned successfully',
      month: monthRange.value,
      deleted: deleteResult.count,
      deletedSampleDrivers,
      deletedSampleVehicles,
    });
  } catch (error) {
    console.error('Error cleaning sample travel stats data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
