'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type RangePreset = '7d' | '30d' | '90d' | 'ytd';

type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'MERGED';

type StatusCounts = Record<BookingStatus, number>;

type StatusTrendItem = { day: string } & Record<BookingStatus, number>;

type ApiResponse = {
  statusCounts: StatusCounts;
  statusTrend: StatusTrendItem[];
  kmSummary: {
    totalKm: number;
    avgKmPerTrip: number;
    missingMileageTrips: number;
  };
  topRoutes: Array<{ route: string; tripCount: number }>;
  timeOfDayBuckets: Record<'0-5' | '6-11' | '12-17' | '18-23' | 'unknown', number>;
  driverQuality: {
    avgRating: number;
    ratingCount: number;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
};

const RANGE_OPTIONS: Array<{ id: RangePreset; label: string }> = [
  { id: '7d', label: '7 วัน' },
  { id: '30d', label: '30 วัน' },
  { id: '90d', label: '90 วัน' },
  { id: 'ytd', label: 'ปีนี้' },
];

/** Numeric height avoids Recharts v3 first-paint warning (internal size starts as -1,-1 with height="100%"). */
const CHART_HEIGHT_PX = 288;

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'รอพิจารณา',
  APPROVED: 'รอยืนยัน',
  CONFIRMED: 'ยืนยันแล้ว',
  IN_PROGRESS: 'กำลังเดินทาง',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
  REJECTED: 'ปฏิเสธ',
  MERGED: 'รวม',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#38bdf8',
  CONFIRMED: '#22c55e',
  IN_PROGRESS: '#8b5cf6',
  COMPLETED: '#16a34a',
  CANCELLED: '#ef4444',
  REJECTED: '#f97316',
  MERGED: '#64748b',
};

function formatDayLabel(dayKey: string) {
  // YYYY-MM-DD -> DD/MM
  const parts = dayKey.split('-');
  if (parts.length !== 3) return dayKey;
  return `${parts[2]}/${parts[1]}`;
}

export default function RequesterMyBookingsOverview({ className }: { className?: string }) {
  const [range, setRange] = useState<RangePreset>('30d');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/my/bookings/stats?range=${encodeURIComponent(range)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'ไม่สามารถโหลดแดชบอร์ดได้');
        }
        const payload: ApiResponse = await res.json();
        if (mounted) {
          setData(payload);
        }
      } catch (e: unknown) {
        if (!mounted) return;
        setData(null);
        setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [range]);

  const statusCards = useMemo(() => {
    if (!data) return [];
    const counts = data.statusCounts;
    const order: BookingStatus[] = ['PENDING', 'APPROVED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'];
    return order.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: counts[status] ?? 0,
      color: STATUS_COLORS[status],
    }));
  }, [data]);

  const trendChartData = useMemo(() => {
    if (!data) return [];
    return data.statusTrend.map((row) => ({
      ...row,
      label: formatDayLabel(row.day),
    }));
  }, [data]);

  const topRoutesChartData = useMemo(() => (data?.topRoutes ?? []).map((r) => ({ ...r, name: r.route })), [data]);

  const timeOfDayChartData = useMemo(() => {
    const buckets = data?.timeOfDayBuckets;
    if (!buckets) return [];
    return [
      { label: '00-05', count: buckets['0-5'] ?? 0 },
      { label: '06-11', count: buckets['6-11'] ?? 0 },
      { label: '12-17', count: buckets['12-17'] ?? 0 },
      { label: '18-23', count: buckets['18-23'] ?? 0 },
      { label: 'ไม่ทราบ', count: buckets.unknown ?? 0 },
    ];
  }, [data]);

  const ratingDistributionData = useMemo(() => {
    const dist = data?.driverQuality?.ratingDistribution;
    if (!dist) return [];
    return ([1, 2, 3, 4, 5] as const).map((star) => ({
      label: `${star} ดาว`,
      count: dist[star] ?? 0,
    }));
  }, [data]);

  const totalBookingsInRange = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.statusCounts).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
  }, [data]);

  return (
    <section className={`rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 ${className ?? ''}`}>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#004c80]">แดชบอร์ด</h2>
          <p className="text-sm text-slate-600">สรุปภาพรวมคำขอของคุณในช่วงเวลาที่เลือก</p>
        </div>
        <div className="inline-flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {RANGE_OPTIONS.map((opt) => {
              const active = opt.id === range;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRange(opt.id)}
                  className={[
                    'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                    active ? 'bg-[#0076c3] text-white' : 'text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading && <p className="py-10 text-center text-slate-500">กำลังโหลดแดชบอร์ด...</p>}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">เกิดข้อผิดพลาด: {error}</div>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">จำนวนคำขอทั้งหมด (ช่วงที่เลือก)</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{totalBookingsInRange.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">ระยะทางรวม (km)</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.kmSummary.totalKm.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">เฉลี่ย {data.kmSummary.avgKmPerTrip.toLocaleString()} km/เที่ยว</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">เที่ยวที่คำนวณระยะทางไม่ได้</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.kmSummary.missingMileageTrips.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">คะแนนคนขับเฉลี่ย (จาก feedback)</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.driverQuality.avgRating.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">{data.driverQuality.ratingCount.toLocaleString()} ข้อเสนอแนะ</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statusCards.slice(0, 8).map((c) => (
              <div key={c.status} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{c.count.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 xl:col-span-2">
              <h3 className="mb-3 font-semibold text-[#004c80]">แนวโน้มสถานะคำขอ (ตามวันที่สร้าง)</h3>
              <div className="w-full min-w-0" style={{ height: CHART_HEIGHT_PX }}>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX} minWidth={0}>
                  <BarChart data={trendChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    {(
                      ['PENDING', 'APPROVED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'] as BookingStatus[]
                    ).map((status) => (
                      <Bar
                        key={status}
                        dataKey={status}
                        stackId="status"
                        name={STATUS_LABELS[status]}
                        fill={STATUS_COLORS[status]}
                        radius={status === 'CANCELLED' ? ([6, 6, 0, 0] as const) : 0}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="mb-3 font-semibold text-[#004c80]">Top เส้นทาง</h3>
              {topRoutesChartData.length === 0 ? (
                <div className="rounded-xl bg-white px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูลเส้นทาง</div>
              ) : (
                <div className="w-full min-w-0" style={{ height: CHART_HEIGHT_PX }}>
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX} minWidth={0}>
                    <BarChart data={topRoutesChartData} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tripCount" name="จำนวนทริป" fill="#0076c3" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="mb-3 font-semibold text-[#004c80]">ช่วงเวลาเริ่มเดินทาง</h3>
              <div className="w-full min-w-0" style={{ height: CHART_HEIGHT_PX }}>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX} minWidth={0}>
                  <BarChart data={timeOfDayChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="จำนวนทริป" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 xl:col-span-2">
              <h3 className="mb-3 font-semibold text-[#004c80]">คุณภาพคนขับ (คะแนน 1-5 ดาว)</h3>
              {ratingDistributionData.length === 0 ? (
                <div className="rounded-xl bg-white px-4 py-8 text-center text-slate-500">ยังไม่มีข้อเสนอแนะในช่วงที่เลือก</div>
              ) : (
                <div className="w-full min-w-0" style={{ height: CHART_HEIGHT_PX }}>
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX} minWidth={0}>
                    <BarChart data={ratingDistributionData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="จำนวนข้อเสนอแนะ" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

