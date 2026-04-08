import { BOOKING_STATUS_LABELS, normalizeBookingStatus, statusBadgeTone } from './status';

export default function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeBookingStatus(status);
  const label = normalized ? BOOKING_STATUS_LABELS[normalized] : status;
  const tone = statusBadgeTone(status);

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1',
        tone.bg,
        tone.text,
        tone.ring,
      ].join(' ')}
    >
      {label}
    </span>
  );
}

