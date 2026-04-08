export type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'MERGED';

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'รอการพิจารณา',
  APPROVED: 'รอยืนยัน',
  CONFIRMED: 'ยืนยันแล้ว',
  REJECTED: 'ปฏิเสธ',
  IN_PROGRESS: 'กำลังเดินทาง',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
  MERGED: 'รวมการเดินทาง',
};

export const normalizeBookingStatus = (status: string): BookingStatus | null => {
  const upper = status.toUpperCase();
  if (upper in BOOKING_STATUS_LABELS) return upper as BookingStatus;
  return null;
};

export const statusBadgeTone = (status: string): { bg: string; text: string; ring: string } => {
  const normalized = normalizeBookingStatus(status);
  switch (normalized) {
    case 'PENDING':
      return { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200/70' };
    case 'APPROVED':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200/70' };
    case 'CONFIRMED':
      return { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200/70' };
    case 'REJECTED':
      return { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200/70' };
    case 'IN_PROGRESS':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200/70' };
    case 'COMPLETED':
      return { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200/80' };
    case 'CANCELLED':
      return { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200/80' };
    case 'MERGED':
      return { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200/70' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', ring: 'ring-gray-200/80' };
  }
};

