import StatusBadge from './StatusBadge';
import { routeTextWrapClass } from './routeTextWrap';
import { formatDateTimeTH } from '@/lib/formatters';

type Props = {
  status: string;
  startLocation?: string | null;
  endLocation?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  vehicle?: { licensePlate?: string | null } | null;
  driver?: { name?: string | null } | null;
};

export default function BookingSummaryHeader({
  status,
  startLocation,
  endLocation,
  startTime,
  endTime,
  vehicle,
  driver,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-600">เส้นทาง</div>
          <div className={`font-semibold text-slate-900 leading-snug ${routeTextWrapClass}`}>
            {(startLocation || '-') + ' → ' + (endLocation || '-')}
          </div>
        </div>
        <div className="shrink-0">
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs text-slate-600">เวลาเริ่ม</div>
          <div className="font-medium text-slate-900">{formatDateTimeTH(startTime)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs text-slate-600">เวลาสิ้นสุด</div>
          <div className="font-medium text-slate-900">{formatDateTimeTH(endTime)}</div>
        </div>
      </div>

      {(vehicle?.licensePlate || driver?.name) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {vehicle?.licensePlate && (
            <div className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200/70">
              <span className="text-slate-600">รถ:</span>{' '}
              <span className="font-medium text-slate-900">{vehicle.licensePlate}</span>
            </div>
          )}
          {driver?.name && (
            <div className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200/70">
              <span className="text-slate-600">คนขับ:</span>{' '}
              <span className="font-medium text-slate-900">{driver.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

