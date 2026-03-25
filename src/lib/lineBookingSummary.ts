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
  return d.toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
  });
}

type BookingRow = {
  id: string;
  purpose: string | null;
  endLocation: string | null;
  startTime: Date | null;
  endTime: Date | null;
  status: BookingStatus;
  createdAt: Date;
  requestForSelf: boolean;
  travelerName: string | null;
  travelerPhone: string | null;
  passengerCount: number | null;
  requester: {
    name: string | null;
    phoneNumber: string | null;
  };
  driver: {
    name: string | null;
    email: string;
    phoneNumber: string | null;
  } | null;
  vehicle: {
    licensePlate: string;
    brand: string | null;
    model: string | null;
    color: string | null;
    type: string | null;
  } | null;
};

function formatOneBooking(b: BookingRow, index: number, total: number): string {
  const head = [`— ${index}/${total} · ${STATUS_TH[b.status]}`];

  const trip = [
    b.purpose ? `วัตถุประสงค์: ${b.purpose}` : null,
    b.endLocation ? `ปลายทาง: ${b.endLocation}` : null,
    `เวลาเริ่ม: ${formatThDate(b.startTime)}`,
    b.endTime ? `เวลาสิ้นสุด: ${formatThDate(b.endTime)}` : null,
    typeof b.passengerCount === 'number' && b.passengerCount > 0
      ? `จำนวนผู้โดยสาร: ${b.passengerCount} คน`
      : null,
  ].filter((x): x is string => !!x);

  const vehicleLines =
    b.vehicle &&
    [
      '🚗 ข้อมูลรถยนต์',
      b.vehicle.brand ? `ยี่ห้อ: ${b.vehicle.brand}` : null,
      b.vehicle.model ? `รุ่น: ${b.vehicle.model}` : null,
      b.vehicle.color ? `สีรถ: ${b.vehicle.color}` : null,
      `ทะเบียน: ${b.vehicle.licensePlate}`,
      b.vehicle.type ? `ประเภท/หมายเหตุรถ: ${b.vehicle.type}` : null,
    ].filter((x): x is string => !!x);

  const driverLines =
    b.driver &&
    [
      '👤 คนขับ',
      `ชื่อ: ${b.driver.name || '-'}`,
      b.driver.phoneNumber
        ? `เบอร์โทรคนขับ: ${b.driver.phoneNumber}`
        : `ติดต่อคนขับ (อีเมล): ${b.driver.email}`,
    ];

  const travelerLines: string[] = [];
  if (b.requestForSelf && (b.requester.name || b.requester.phoneNumber)) {
    travelerLines.push(
      '📞 ผู้โดยสาร (ผู้ขอใช้รถ — ใช้ให้คนขับติดต่อ/หาคนได้)'
    );
    if (b.requester.name) travelerLines.push(`ชื่อ: ${b.requester.name}`);
    if (b.requester.phoneNumber) travelerLines.push(`เบอร์โทร: ${b.requester.phoneNumber}`);
  } else if (!b.requestForSelf && (b.travelerName || b.travelerPhone)) {
    travelerLines.push(
      '🧳 ผู้เดินทาง (กรณีขอแทนผู้อื่น — ให้คนขับใช้ติดต่อ/หาคน)'
    );
    if (b.travelerName) travelerLines.push(`ชื่อผู้โดยสาร: ${b.travelerName}`);
    if (b.travelerPhone) travelerLines.push(`เบอร์โทรผู้โดยสาร: ${b.travelerPhone}`);
  }
  const travelerBlock = travelerLines.filter((x): x is string => !!x);

  const tip = [
    '',
    '💡 นัดเจอ: ยืนยันทะเบียน+สีรถ / ชื่อ / เบอร์โทรก่อนออกเดินทาง ลดการหาผิดคัน',
  ];

  const parts = [
    ...head,
    '',
    ...trip,
    '',
    ...(vehicleLines || ['🚗 รถ: (ยังไม่ระบุ — รอแอดมิน/ระบบจัดรถ)']),
    '',
    ...(driverLines || ['👤 คนขับ: (ยังไม่ระบุ)']),
    ...(travelerBlock.length ? ['', ...travelerBlock] : []),
    ...tip,
  ];

  return parts.filter((x): x is string => x !== null).join('\n');
}

function splitLongText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    out.push(text.slice(i, i + maxLen));
  }
  return out;
}

export function buildLineBookingMessages(bookings: BookingRow[]): string[] {
  const header =
    '📋 รายการจองที่ยังดำเนินการอยู่ (ไม่รวมที่เสร็จสิ้นหรือยกเลิกแล้ว)';

  if (bookings.length === 0) {
    return [
      'ไม่มีรายการจองที่ยังดำเนินการอยู่\n(ไม่แสดงการจองที่เสร็จสิ้นหรือยกเลิกแล้ว)',
    ];
  }

  const total = bookings.length;
  const blocks = bookings.map((b, i) => formatOneBooking(b, i + 1, total));
  const fullText = `${header}\n\n${blocks.join('\n\n')}`;
  return splitLongText(fullText, MAX_CHARS_PER_MESSAGE);
}
