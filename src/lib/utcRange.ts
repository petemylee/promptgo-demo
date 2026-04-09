export type RangePreset = '7d' | '30d' | '90d' | 'ytd';

export type UtcRange = {
  preset: RangePreset;
  startInclusive: Date;
  endExclusive: Date;
  timezone: 'UTC';
};

const RANGE_PRESETS: RangePreset[] = ['7d', '30d', '90d', 'ytd'];

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function startOfTomorrowUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0));
}

export function parseRangePreset(value: string | null | undefined): RangePreset {
  if (!value) return '30d';
  return (RANGE_PRESETS as string[]).includes(value) ? (value as RangePreset) : '30d';
}

export function getUtcRange(preset: RangePreset, now = new Date()): UtcRange {
  const endExclusive = startOfTomorrowUtc(now);

  if (preset === 'ytd') {
    const startInclusive = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    return { preset, startInclusive, endExclusive, timezone: 'UTC' };
  }

  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  const startDay = startOfUtcDay(now);
  startDay.setUTCDate(startDay.getUTCDate() - (days - 1));
  return { preset, startInclusive: startDay, endExclusive, timezone: 'UTC' };
}

export function enumerateUtcDays(startInclusive: Date, endExclusive: Date) {
  const days: Date[] = [];
  const cursor = new Date(Date.UTC(startInclusive.getUTCFullYear(), startInclusive.getUTCMonth(), startInclusive.getUTCDate(), 0, 0, 0, 0));
  while (cursor.getTime() < endExclusive.getTime()) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function formatUtcDayKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

