const BANGKOK_TIMEZONE = 'Asia/Bangkok';

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
