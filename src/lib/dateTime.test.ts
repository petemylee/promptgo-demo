import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBangkokDateYYYYMMDD,
  formatBangkokTimeHM,
  parseBangkokDateTimeLocal,
  toBangkokDateTimeLocalInput,
} from '@/lib/dateTime';
import { buildBookingNotification } from '@/lib/lineNotifications';

test('parseBangkokDateTimeLocal parses datetime-local as Bangkok time', () => {
  const parsed = parseBangkokDateTimeLocal('2026-03-26T10:15');
  assert.ok(parsed instanceof Date);
  assert.equal(parsed?.toISOString(), '2026-03-26T03:15:00.000Z');
});

test('toBangkokDateTimeLocalInput round-trips without shifting hour', () => {
  const parsed = parseBangkokDateTimeLocal('2026-03-26T10:15');
  assert.ok(parsed instanceof Date);
  assert.equal(toBangkokDateTimeLocalInput(parsed), '2026-03-26T10:15');
});

test('Bangkok date and time formatting is deterministic', () => {
  const value = new Date('2026-03-26T03:15:00.000Z');
  assert.equal(formatBangkokDateYYYYMMDD(value), '2026-03-26');
  assert.equal(formatBangkokTimeHM(value), '10:15');
});

test('LINE booking notification uses Bangkok-formatted time', () => {
  const message = buildBookingNotification('BOOKING_CREATED_REQUESTER', {
    id: 'BK-001',
    status: 'PENDING',
    endLocation: 'สำนักงานใหญ่',
    purpose: 'ประชุม',
    startTime: new Date('2026-03-26T03:15:00.000Z'),
    endTime: new Date('2026-03-26T05:00:00.000Z'),
    requester: {
      name: 'Test User',
      phoneNumber: '0999999999',
      position: 'Developer',
    },
  });

  assert.match(message, /วันที่เดินทาง: 2026-03-26/);
  assert.match(message, /เวลาออกเดินทาง: 10:15 น\./);
});
