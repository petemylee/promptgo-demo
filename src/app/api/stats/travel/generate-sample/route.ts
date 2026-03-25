import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

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

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomIndex(length: number) {
  return Math.floor(Math.random() * length);
}

function pickRandom<T>(items: T[]): T {
  return items[pickRandomIndex(items.length)];
}

const SAMPLE_NOTE = 'generated-sample-travel-stats';
const SAMPLE_PURPOSE = 'ข้อมูลทดสอบสถิติการเดินทาง';
const SAMPLE_DRIVER_EMAIL_PREFIX = 'sample-travel-driver-';
const SAMPLE_DRIVER_EMAIL_DOMAIN = 'local.test';
const SAMPLE_VEHICLE_PLATE_PREFIX = 'TS-TEST-';
const SAMPLE_FEEDBACK_COMMENTS = [
  'ขับรถสุภาพและตรงเวลา',
  'ให้บริการดี พูดจาสุภาพ',
  'ดูแลผู้โดยสารดีมาก',
  'เส้นทางเหมาะสม เดินทางราบรื่น',
  'โดยรวมพึงพอใจในการให้บริการ',
];

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

    const requestedCount = Number(body.count ?? 20);
    const count = Math.max(1, Math.min(200, Number.isFinite(requestedCount) ? requestedCount : 20));
    const requestedFeedbackRate = Number(body.feedbackRate ?? 0.8);
    const feedbackRate = Number.isFinite(requestedFeedbackRate)
      ? Math.max(0, Math.min(1, requestedFeedbackRate))
      : 0.8;

    const [vehicles, drivers] = await Promise.all([
      prisma.vehicle.findMany({
        select: { id: true, currentMileage: true },
      }),
      prisma.user.findMany({
        where: { role: 'Driver', isActive: true },
        select: { id: true },
      }),
    ]);

    const minDrivers = Math.max(1, Math.min(10, Number(body.minDrivers ?? 3)));
    const minVehicles = Math.max(1, Math.min(10, Number(body.minVehicles ?? 3)));
    let createdSampleDrivers = 0;
    let createdSampleVehicles = 0;

    if (drivers.length < minDrivers) {
      const toCreate = minDrivers - drivers.length;
      for (let i = 0; i < toCreate; i += 1) {
        const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`;
        const createdDriver = await prisma.user.create({
          data: {
            name: `Driver Sample ${token.slice(-4)}`,
            email: `${SAMPLE_DRIVER_EMAIL_PREFIX}${token}@${SAMPLE_DRIVER_EMAIL_DOMAIN}`,
            password: 'sample-generated',
            role: 'Driver',
            isActive: true,
            position: 'Sample Driver',
          },
          select: { id: true },
        });
        drivers.push(createdDriver);
        createdSampleDrivers += 1;
      }
    }

    if (vehicles.length < minVehicles) {
      const toCreate = minVehicles - vehicles.length;
      for (let i = 0; i < toCreate; i += 1) {
        const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`;
        const createdVehicle = await prisma.vehicle.create({
          data: {
            licensePlate: `${SAMPLE_VEHICLE_PLATE_PREFIX}${token.slice(-6).toUpperCase()}`,
            brand: 'Sample',
            model: 'Travel Stats',
            type: 'TEST',
            currentMileage: randomBetween(8000, 30000),
          },
          select: { id: true, currentMileage: true },
        });
        vehicles.push(createdVehicle);
        createdSampleVehicles += 1;
      }
    }

    const requesterId = session.user.id;
    let created = 0;
    let createdFeedbacks = 0;
    const usedVehicleIds = new Set<string>();
    const usedDriverIds = new Set<string>();

    // กระจายให้ใช้หลายรถ/หลายคนขับก่อนอย่างน้อยรอบแรก (ถ้ามีมากกว่า 1)
    const ensureSpreadRounds = Math.min(count, Math.max(vehicles.length, drivers.length));

    for (let i = 0; i < count; i += 1) {
      const vehicle =
        i < ensureSpreadRounds
          ? vehicles[i % vehicles.length]
          : vehicles[pickRandomIndex(vehicles.length)];
      const driver =
        i < ensureSpreadRounds
          ? drivers[i % drivers.length]
          : drivers[pickRandomIndex(drivers.length)];
      const day = randomBetween(1, 26);
      const startHour = randomBetween(7, 15);
      const tripHours = randomBetween(1, 4);
      const km = randomBetween(18, 160);

      const tripStart = new Date(Date.UTC(
        monthRange.startDate.getUTCFullYear(),
        monthRange.startDate.getUTCMonth(),
        day,
        startHour,
        0,
        0,
      ));
      const tripEnd = new Date(tripStart.getTime() + tripHours * 60 * 60 * 1000);
      if (tripEnd >= monthRange.endDate) {
        continue;
      }

      const baseMileage = (vehicle.currentMileage ?? 10000) + i * 7;
      const createdBooking = await prisma.booking.create({
        data: {
          purpose: SAMPLE_PURPOSE,
          endLocation: `สถานที่ทดสอบ ${i + 1}`,
          startTime: tripStart,
          endTime: tripEnd,
          passengerCount: randomBetween(1, 4),
          status: 'COMPLETED',
          startMileage: baseMileage,
          endMileage: baseMileage + km,
          vehicleId: vehicle.id,
          driverId: driver.id,
          requesterId,
          adminApproverId: session.user.id,
          executiveConfirmerId: session.user.id,
          executiveConfirmedAt: tripStart,
          additionalNotes: SAMPLE_NOTE,
        },
        select: {
          id: true,
          driverId: true,
          requesterId: true,
        },
      });

      if (Math.random() < feedbackRate && createdBooking.driverId) {
        const weightedRatings = [3, 4, 4, 4, 5, 5, 5];
        const rating = pickRandom(weightedRatings);
        await prisma.driverFeedback.create({
          data: {
            driverId: createdBooking.driverId,
            requesterId: createdBooking.requesterId,
            bookingId: createdBooking.id,
            rating,
            comment: pickRandom(SAMPLE_FEEDBACK_COMMENTS),
          },
        });
        createdFeedbacks += 1;
      }

      usedVehicleIds.add(vehicle.id);
      usedDriverIds.add(driver.id);
      created += 1;
    }

    return NextResponse.json({
      message: 'Sample travel data generated successfully',
      month: monthRange.value,
      requested: count,
      created,
      createdFeedbacks,
      usedVehicles: usedVehicleIds.size,
      usedDrivers: usedDriverIds.size,
      createdSampleDrivers,
      createdSampleVehicles,
    });
  } catch (error) {
    console.error('Error generating sample travel stats data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
