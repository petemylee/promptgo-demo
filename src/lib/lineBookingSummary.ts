import type { BookingStatus } from '@prisma/client';

/** ใช้เป็น `data` ใน Rich Menu / postback ของปุ่ม "ติดตามสถานะการจอง" */
export const LINE_POSTBACK_TRACK_MY_BOOKINGS = 'track_my_bookings';

const STATUS_TH: Record<BookingStatus, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  CONFIRMED: 'ยืนยันแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  IN_PROGRESS: 'กำลังเดินทาง',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
  MERGED: 'รวมคำขอ',
};

const MAX_CHARS_PER_MESSAGE = 4500;

function formatThDate(d: Date | null): string {
  if (!d) return '-';
  return d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

type BookingRow = {
  id: string;
  purpose: string | null;
  endLocation: string | null;
  startTime: Date | null;
  endTime: Date | null;
  status: BookingStatus;
  createdAt: Date;
  driver: { name: string | null; email: string } | null;
  vehicle: {
    licensePlate: string;
    brand: string | null;
    model: string | null;
  } | null;
};

function formatOneBooking(b: BookingRow, index: number, total: number): string {
  const shortId = b.id.slice(0, 8);
  const lines = [
    `— ${index}/${total} · #${shortId} · ${STATUS_TH[b.status]}`,
    b.purpose ? `วัตถุประสงค์: ${b.purpose}` : null,
    b.endLocation ? `ปลายทาง: ${b.endLocation}` : null,
    `เวลาเริ่ม: ${formatThDate(b.startTime)}`,
    b.endTime ? `เวลาสิ้นสุด: ${formatThDate(b.endTime)}` : null,
    b.driver ? `คนขับ: ${b.driver.name || b.driver.email}` : null,
    b.vehicle
      ? `ทะเบียน: ${b.vehicle.licensePlate} (${[b.vehicle.brand, b.vehicle.model].filter(Boolean).join(' ') || '-'})`
      : null,
  ].filter((x): x is string => !!x);
  return lines.join('\n');
}

function splitLongText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    out.push(text.slice(i, i + maxLen));
  }
  return out;
}

export function buildLineBookingMessages(
  bookings: BookingRow[],
  publicBaseUrl: string
): string[] {
  const header = '📋 รายการจองของคุณ (ผู้ขอใช้รถ)';
  const webHint = publicBaseUrl
    ? `ดูรายละเอียดเพิ่มเติม: ${publicBaseUrl}/requester`
    : 'ดูรายละเอียดเพิ่มเติมได้ที่เว็บ OFM PROMPTGO หลังล็อกอิน';

  if (bookings.length === 0) {
    return [`ยังไม่มีรายการจองในฐานะผู้ขอใช้รถ\n\n${webHint}`];
  }

  const total = bookings.length;
  const blocks = bookings.map((b, i) => formatOneBooking(b, i + 1, total));
  const fullText = `${header}\n\n${blocks.join('\n\n')}\n\n${webHint}`;
  return splitLongText(fullText, MAX_CHARS_PER_MESSAGE);
}
