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

type ApiResponse = {
  topRoutes: Array<{ route: string; tripCount: number }>;
  heatmap: Array<{ dow: number; hour: number; count: number }>;
};

const RANGE_OPTIONS: Array<{ id: RangePreset; label: string }> = [
  { id: '7d', label: '7 วัน' },
  { id: '30d', label: '30 วัน' },
  { id: '90d', label: '90 วัน' },
  { id: 'ytd', label: 'ปีนี้' },
];

const DOW_LABELS: Record<number, string> = {
  0: 'อา',
  1: 'จ',
  2: 'อ',
  3: 'พ',
  4: 'พฤ',
  5: 'ศ',
  6: 'ส',
};

/** Numeric height avoids Recharts v3 first-paint warning (internal size starts as -1,-1 with height="100%"). */
const CHART_HEIGHT_PX = 288;

function getMaxCount(items: Array<{ count: number }>) {
  return items.reduce((m, x) => Math.max(m, x.count ?? 0), 0);
}

function intensityStyle(count: number, max: number) {
  if (!max || count <= 0) return { backgroundColor: 'rgba(148, 163, 184, 0.18)' }; // slate-400-ish
  const t = count / max;
  const alpha = 0.18 + t * 0.62;
  return { backgroundColor: `rgba(0, 118, 195, ${alpha.toFixed(3)})` };
}

export default function BookingInsightsOverview({ className }: { className?: string }) {
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
        const res = await fetch(`/api/stats/booking-insights?range=${encodeURIComponent(range)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'ไม่สามารถโหลดข้อมูลวิเคราะห์ได้');
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

  const topRoutesChartData = useMemo(
    () => (data?.topRoutes ?? []).map((r) => ({ ...r, name: r.route })),
    [data],
  );

  const heatmapGrid = useMemo(() => {
    const items = data?.heatmap ?? [];
    const map = new Map<string, number>();
    for (const x of items) {
      map.set(`${x.dow}-${x.hour}`, x.count);
    }
    const max = getMaxCount(items);
    return { map, max };
  }, [data]);

  return (
    <section className={`rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 ${className ?? ''}`}>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#004c80]">วิเคราะห์การจอง</h2>
          <p className="text-sm text-slate-600">Top เส้นทาง และ heatmap ตามเวลาเริ่มเดินทาง</p>
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

      {isLoading && <p className="py-10 text-center text-slate-500">กำลังโหลดข้อมูลวิเคราะห์...</p>}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">เกิดข้อผิดพลาด: {error}</div>
      )}

      {!isLoading && !error && data && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tripCount" name="จำนวนทริป" fill="#0076c3" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="mb-3 font-semibold text-[#004c80]">Heatmap เวลาเริ่มเดินทาง</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[56px_repeat(24,1fr)] gap-1 text-xs text-slate-600">
                  <div />
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="text-center">
                      {hour}
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid gap-1">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const dow = i; // 0..6
                    return (
                      <div key={dow} className="grid grid-cols-[56px_repeat(24,1fr)] gap-1 items-stretch">
                        <div className="text-xs font-semibold text-[#004c80] flex items-center">{DOW_LABELS[dow] ?? String(dow)}</div>
                        {Array.from({ length: 24 }).map((__, hour) => {
                          const count = heatmapGrid.map.get(`${dow}-${hour}`) ?? 0;
                          return (
                            <div
                              key={hour}
                              title={`${DOW_LABELS[dow] ?? dow} ${String(hour).padStart(2, '0')}:00 • ${count} ทริป`}
                              className="h-7 rounded-md ring-1 ring-slate-200/70"
                              style={intensityStyle(count, heatmapGrid.max)}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-500">หมายเหตุ: ใช้เวลาแบบ UTC (ตามระบบรายงานภายใน)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

