'use client';

import { useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { parseBangkokDateTimeLocal, toBangkokDateTimeLocalInput } from '@/lib/dateTime';

type DateTimePicker24Props = {
  id: string;
  label: React.ReactNode;
  value: string;
  min?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onChange: (nextValue: string) => void;
  timeIntervals?: number;
};

function sameBangkokDay(a: Date, b: Date): boolean {
  // Compare using sv-SE in Bangkok to avoid local timezone drift.
  const aKey = a.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  const bKey = b.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  return aKey === bKey;
}

export default function DateTimePicker24({
  id,
  label,
  value,
  min,
  required = false,
  disabled = false,
  className,
  onChange,
  timeIntervals = 5,
}: DateTimePicker24Props) {
  const selected = value ? parseBangkokDateTimeLocal(value) : null;
  const minDateTime = min ? parseBangkokDateTimeLocal(min) : null;

  const minDate = useMemo(() => (minDateTime ? new Date(minDateTime) : undefined), [minDateTime]);

  const minTime = useMemo(() => {
    if (!minDateTime) return undefined;
    if (!selected) return minDateTime;
    if (!sameBangkokDay(selected, minDateTime)) return undefined;
    return minDateTime;
  }, [minDateTime, selected]);

  const maxTime = useMemo(() => {
    if (!minTime) return undefined;
    const end = new Date(minTime);
    end.setHours(23, 59, 0, 0);
    return end;
  }, [minTime]);

  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor={id}>
        {label}
      </label>
      <DatePicker
        id={id}
        selectsRange={false}
        selectsMultiple={false}
        selected={selected}
        onChange={(next: Date | null) => onChange(next ? toBangkokDateTimeLocalInput(next) : '')}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={timeIntervals}
        timeCaption="เวลา"
        dateFormat="dd/MM/yyyy HH:mm"
        minDate={minDate}
        minTime={minTime}
        maxTime={maxTime}
        placeholderText="เลือกวันและเวลา"
        disabled={disabled}
        required={required}
        className={className}
        autoComplete="off"
      />
    </div>
  );
}

