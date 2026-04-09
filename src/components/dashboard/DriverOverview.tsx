'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type RangePreset = '7d' | '30d' | '90d' | 'ytd';

type ApiResponse = {
  jobCounts: Record<string, number>;
  completedTrend: Array<{ day: string; completedTrips: number }>;
  kmSummary: { totalKm: number; avgKmPerTrip: number; missingMileageTrips: number };
  hoursSummary: { totalHours: number; avgHoursPerTrip: number; missingTimeTrips: number };
  feedbackSummary: {
    avgRating: number;
    ratingCount: number;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  topDestinations: Array<{ destination: string; tripCount: number }>;
};

const RANGE_OPTIONS: Array<{ id: RangePreset; label: string }> = [
  { id: '7d', label: '7 วัน' },
  { id: '30d', label: '30 วัน' },
  { id: '90d', label: '90 วัน' },
  { id: 'ytd', label: 'ปีนี้' },
];

/** Numeric height avoids Recharts v3 first-paint warning (internal size starts as -1,-1 with height="100%"). */
const CHART_HEIGHT_PX = 288;

function formatDayLabel(dayKey: string) {
  const parts = dayKey.split('-');
  if (parts.length !== 3) return dayKey;
  return `${parts[2]}/${parts[1]}`;
}

export default function DriverOverview({ className }: { className?: string }) {
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
        const res = await fetch(`/api/driver/stats?range=${encodeURIComponent(range)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'ไม่สามารถโหลดแดชบอร์ดคนขับได้');
        }
        const payload: ApiResponse = await res.json();
        if (mounted) setData(payload);
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

  const workloadCards = useMemo(() => {
    const counts = data?.jobCounts ?? {};
    const get = (k: string) => (typeof counts[k] === 'number' ? counts[k] : 0);
    return [
      { label: 'งานที่ได้รับมอบหมาย', value: get('CONFIRMED'), tone: 'blue' as const },
      { label: 'กำลังทำงาน', value: get('IN_PROGRESS'), tone: 'purple' as const },
      { label: 'เสร็จสิ้น', value: get('COMPLETED'), tone: 'green' as const },
      { label: 'ยกเลิก/ปฏิเสธ', value: get('CANCELLED') + get('REJECTED'), tone: 'red' as const },
    ];
  }, [data]);

  const completedTrendChartData = useMemo(() => {
    if (!data) return [];
    return data.completedTrend.map((row) => ({ ...row, label: formatDayLabel(row.day) }));
  }, [data]);

  const ratingDistributionData = useMemo(() => {
    const dist = data?.feedbackSummary?.ratingDistribution;
    if (!dist) return [];
    return ([1, 2, 3, 4, 5] as const).map((star) => ({ label: `${star} ดาว`, count: dist[star] ?? 0 }));
  }, [data]);

  const topDestinationsChartData = useMemo(
    () => (data?.topDestinations ?? []).map((x) => ({ ...x, name: x.destination })),
    [data],
  );

  return (
    <section className={`rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 ${className ?? ''}`}>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#004c80]">แดชบอร์ดคนขับ</h2>
          <p className="text-sm text-slate-600">สรุปงาน ระยะทาง เวลา และคะแนนในช่วงเวลาที่เลือก</p>
        </div>
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

      {isLoading && <p className="py-10 text-center text-slate-500">กำลังโหลดแดชบอร์ด...</p>}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">เกิดข้อผิดพลาด: {error}</div>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workloadCards.map((c) => (
              <div key={c.label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#004c80]">{c.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">ระยะทางรวม (km)</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.kmSummary.totalKm.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">เฉลี่ย {data.kmSummary.avgKmPerTrip.toLocaleString()} km/เที่ยว</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">เวลาเดินทางรวม (ชั่วโมง)</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.hoursSummary.totalHours.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">เฉลี่ย {data.hoursSummary.avgHoursPerTrip.toLocaleString()} ชม./เที่ยว</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">เที่ยวที่ขาดเลขไมล์</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.kmSummary.missingMileageTrips.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">คะแนนเฉลี่ย (จาก feedback)</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.feedbackSummary.avgRating.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">{data.feedbackSummary.ratingCount.toLocaleString()} ข้อเสนอแนะ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 xl:col-span-2">
              <h3 className="mb-3 font-semibold text-[#004c80]">แนวโน้มงานที่เสร็จสิ้น</h3>
              <div className="w-full min-w-0" style={{ height: CHART_HEIGHT_PX }}>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX} minWidth={0}>
                  <LineChart data={completedTrendChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completedTrips"
                      name="งานเสร็จสิ้น"
                      stroke="#0076c3"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="mb-3 font-semibold text-[#004c80]">คะแนน 1-5 ดาว</h3>
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

            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="mb-3 font-semibold text-[#004c80]">Top ปลายทาง</h3>
              {topDestinationsChartData.length === 0 ? (
                <div className="rounded-xl bg-white px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูลปลายทาง</div>
              ) : (
                <div className="w-full min-w-0" style={{ height: CHART_HEIGHT_PX }}>
                  <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX} minWidth={0}>
                    <BarChart data={topDestinationsChartData} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tripCount" name="จำนวนทริป" fill="#22c55e" radius={[0, 6, 6, 0]} />
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

