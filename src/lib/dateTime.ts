import { TZDate } from '@date-fns/tz';

const BANGKOK_TIMEZONE = 'Asia/Bangkok';

export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

export type BangkokCalendarParts = {
  day: number;
  monthIndex: number;
  year: number;
};

export type BangkokPdfDateFields = {
  day: string;
  month: string;
  buddhistYear: string;
  dateLong: string;
  time: string;
};

export type BangkokMonthRange = {
  value: string;
  startDate: Date;
  endDate: Date;
  year: number;
  monthIndex: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function parseDateTimeLocalParts(value: string): [number, number, number, number, number] | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  ];
}

export function parseBangkokDateTimeLocal(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parts = parseDateTimeLocalParts(value);
  if (!parts) return null;
  const [year, month, day, hour, minute] = parts;
  // Keep booking time anchored to Bangkok regardless of server timezone.
  const iso = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00+07:00`;
  const date = new Date(iso);
  return isValidDate(date) ? date : null;
}

export function parseMaybeDateInput(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value !== 'string') return null;

  const bangkokLocal = parseBangkokDateTimeLocal(value);
  if (bangkokLocal) return bangkokLocal;

  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed : null;
}

export function toBangkokDateTimeLocalInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return '';

  // sv-SE gives YYYY-MM-DD HH:mm:ss in 24h format.
  const formatted = date.toLocaleString('sv-SE', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formatted.replace(' ', 'T').slice(0, 16);
}

export function formatBangkokDateYYYYMMDD(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return '-';
  return date.toLocaleDateString('sv-SE', { timeZone: BANGKOK_TIMEZONE });
}

export function formatBangkokTimeHM(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return '-';
  return date.toLocaleTimeString('th-TH', {
    timeZone: BANGKOK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatBangkokDateTime(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return '-';
  return date.toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
    timeZone: BANGKOK_TIMEZONE,
  });
}

/** Midnight at start of calendar day in Asia/Bangkok (wall clock). */
export function bangkokStartOfToday(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) return new Date(NaN);
  const iso = `${y}-${m}-${d}T00:00:00+07:00`;
  const date = new Date(iso);
  return isValidDate(date) ? date : new Date(NaN);
}

/** Value for `datetime-local` min= matching parseBangkokDateTimeLocal (00:00 Bangkok today). */
export function bangkokStartOfTodayDatetimeLocalString(): string {
  return toBangkokDateTimeLocalInput(bangkokStartOfToday());
}

export function isBeforeBangkokStartOfToday(date: Date): boolean {
  if (!isValidDate(date)) return true;
  return date.getTime() < bangkokStartOfToday().getTime();
}

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return isValidDate(date) ? date : null;
}

/** Calendar day/month/year in Asia/Bangkok (not server local TZ). */
export function getBangkokCalendarParts(
  value: Date | string | null | undefined
): BangkokCalendarParts | null {
  const date = toValidDate(value);
  if (!date) return null;
  const tz = new TZDate(date.getTime(), BANGKOK_TIMEZONE);
  return {
    day: tz.getDate(),
    monthIndex: tz.getMonth(),
    year: tz.getFullYear(),
  };
}

export function getBangkokPdfDateFields(
  value: Date | string | null | undefined
): BangkokPdfDateFields | null {
  const parts = getBangkokCalendarParts(value);
  if (!parts) return null;
  const month = THAI_MONTHS[parts.monthIndex];
  return {
    day: parts.day.toString(),
    month,
    buddhistYear: (parts.year + 543).toString(),
    dateLong: `${parts.day} ${month} ${parts.year + 543}`,
    time: formatBangkokTimeHM(value),
  };
}

export function formatBangkokThaiBuddhistDateLong(
  value: Date | string | null | undefined
): string {
  const fields = getBangkokPdfDateFields(value);
  return fields?.dateLong ?? '-';
}

export function formatBangkokDateTimeReport(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = toValidDate(value);
  if (!date) return '-';
  return date.toLocaleString('th-TH', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Current calendar month in Asia/Bangkok as YYYY-MM. */
export function currentBangkokMonthYYYYMM(): string {
  const tz = TZDate.tz(BANGKOK_TIMEZONE);
  return `${tz.getFullYear()}-${pad2(tz.getMonth() + 1)}`;
}

/** Parse YYYY-MM as a Bangkok calendar month; range uses midnight Bangkok boundaries. */
export function parseBangkokMonthValue(value: string): BangkokMonthRange | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const [yearRaw, monthRaw] = value.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }
  const startDate = new Date(new TZDate(year, monthIndex, 1, BANGKOK_TIMEZONE).getTime());
  const endDate = new Date(new TZDate(year, monthIndex + 1, 1, BANGKOK_TIMEZONE).getTime());
  return { value, startDate, endDate, year, monthIndex };
}

export function bangkokMonthRangeFromTo(
  fromParam: string | null,
  toParam: string | null
): { from: BangkokMonthRange; to: BangkokMonthRange; startDate: Date; endDate: Date } | null {
  const fromValue = fromParam ?? currentBangkokMonthYYYYMM();
  const toValue = toParam ?? fromValue;
  const from = parseBangkokMonthValue(fromValue);
  const to = parseBangkokMonthValue(toValue);
  if (!from || !to) return null;
  if (from.value > to.value) return null;
  return { from, to, startDate: from.startDate, endDate: to.endDate };
}
