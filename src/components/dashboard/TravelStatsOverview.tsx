'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TravelStatsResponse } from '@/types/travelStats';

interface TravelStatsOverviewProps {
  role?: 'Admin' | 'Executive';
  month?: string;
  className?: string;
}

const FEEDBACK_REFRESH_EVENT = 'feedback-stats:refresh';

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function TravelStatsOverview({ month, className }: TravelStatsOverviewProps) {
  const [selectedMonth, setSelectedMonth] = useState(month ?? getCurrentMonthValue());
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [data, setData] = useState<TravelStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/stats/travel?month=${encodeURIComponent(selectedMonth)}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to fetch travel statistics');
        }
        const payload: TravelStatsResponse = await response.json();
        if (mounted) {
          setData(payload);
        }
      } catch (err: unknown) {
        if (!mounted) {
          return;
        }
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [selectedMonth]);

  const vehicleKmChartData = useMemo(() => (data?.byVehicleKm ?? []).slice(0, 8), [data]);
  const driverJobsChartData = useMemo(() => (data?.byDriverJobs ?? []).slice(0, 8), [data]);
  const tripTrendChartData = useMemo(() => {
    if (!data) return [];
    if (trendGranularity === 'week') return data.tripTrendByWeek;
    if (trendGranularity === 'month') return data.tripTrendByMonth;
    return data.tripTrendByDay;
  }, [data, trendGranularity]);

  const escapeCsvValue = (value: string | number) => {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const downloadCsv = () => {
    if (!data) return;

    const lines: string[] = [];
    lines.push('เดือน,หมวด,รายการ,ชื่อ,จำนวนเที่ยว,ระยะทาง(km),ค่า');
    lines.push([
      escapeCsvValue(data.meta.month),
      'สรุป',
      'ระยะทางรวม',
      '',
      '',
      '',
      escapeCsvValue(data.summary.totalKm),
    ].join(','));
    lines.push([
      escapeCsvValue(data.meta.month),
      'สรุป',
      'จำนวนเที่ยวเสร็จสิ้น',
      '',
      '',
      '',
      escapeCsvValue(data.summary.completedTrips),
    ].join(','));
    lines.push([
      escapeCsvValue(data.meta.month),
      'สรุป',
      'จำนวนรถที่ถูกใช้งาน',
      '',
      '',
      '',
      escapeCsvValue(data.summary.activeVehicles),
    ].join(','));
    lines.push([
      escapeCsvValue(data.meta.month),
      'สรุป',
      'จำนวนคนขับที่ทำงาน',
      '',
      '',
      '',
      escapeCsvValue(data.summary.activeDrivers),
    ].join(','));
    lines.push([
      escapeCsvValue(data.meta.month),
      'สรุป',
      'ระยะทางเฉลี่ยต่อเที่ยว',
      '',
      '',
      '',
      escapeCsvValue(data.summary.avgKmPerTrip),
    ].join(','));
    lines.push([
      escapeCsvValue(data.meta.month),
      'สรุป',
      'เที่ยวที่คำนวณระยะทางไม่ได้',
      '',
      '',
      '',
      escapeCsvValue(data.meta.missingMileageTrips),
    ].join(','));
    lines.push('');
    lines.push('เดือน,หมวด,รายการ,ชื่อ,จำนวนเที่ยว,ระยะทาง(km),ค่า');

    for (const row of data.byVehicleKm) {
      lines.push([
        escapeCsvValue(data.meta.month),
        'ระยะทางตามรถ',
        'ระยะทางรวมของรถ',
        escapeCsvValue(row.licensePlate),
        escapeCsvValue(row.tripCount),
        escapeCsvValue(row.totalKm),
        '',
      ].join(','));
    }
    lines.push('');
    lines.push('เดือน,หมวด,รายการ,ชื่อ,จำนวนเที่ยว,ระยะทาง(km),ค่า');

    for (const row of data.byDriverJobs) {
      lines.push([
        escapeCsvValue(data.meta.month),
        'งานคนขับ',
        'จำนวนงานของคนขับ',
        escapeCsvValue(row.driverName),
        escapeCsvValue(row.tripCount),
        escapeCsvValue(row.totalKm),
        '',
      ].join(','));
    }
    lines.push('');
    lines.push('เดือน,หมวด,รายการ,ชื่อ,จำนวนเที่ยว,ระยะทาง(km),ค่า');

    for (const row of data.byVehicleJobs) {
      lines.push([
        escapeCsvValue(data.meta.month),
        'ความถี่การใช้รถ',
        'จำนวนเที่ยวของรถ',
        escapeCsvValue(row.licensePlate),
        escapeCsvValue(row.tripCount),
        '',
        '',
      ].join(','));
    }

    const csvContent = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `travel-stats-${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerateSample = async () => {
    if (!confirm(`ต้องการสร้างข้อมูลตัวอย่างสำหรับเดือน ${selectedMonth} ใช่หรือไม่?`)) {
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/stats/travel/generate-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, count: 20 }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate sample data');
      }
      alert(
        `สร้างข้อมูลตัวอย่างสำเร็จ ${result.created ?? 0} รายการ` +
          `\nสร้าง feedback ตัวอย่าง ${result.createdFeedbacks ?? 0} รายการ` +
          `\nใช้รถ ${result.usedVehicles ?? 0} คัน | คนขับ ${result.usedDrivers ?? 0} คน` +
          `\nสร้างรถทดสอบเพิ่ม ${result.createdSampleVehicles ?? 0} คัน | คนขับทดสอบเพิ่ม ${result.createdSampleDrivers ?? 0} คน`,
      );
      const statsResponse = await fetch(`/api/stats/travel?month=${encodeURIComponent(selectedMonth)}`);
      if (statsResponse.ok) {
        const payload: TravelStatsResponse = await statsResponse.json();
        setData(payload);
      }
      window.dispatchEvent(new Event(FEEDBACK_REFRESH_EVENT));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate sample data');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCleanupSample = async () => {
    if (!confirm(`ต้องการลบข้อมูลตัวอย่างของเดือน ${selectedMonth} ใช่หรือไม่?`)) {
      return;
    }
    setIsCleaning(true);
    setError(null);
    try {
      const response = await fetch('/api/stats/travel/cleanup-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to cleanup sample data');
      }
      alert(
        `ลบข้อมูลตัวอย่างสำเร็จ ${result.deleted ?? 0} รายการ` +
          `\nลบรถทดสอบ ${result.deletedSampleVehicles ?? 0} คัน | ลบคนขับทดสอบ ${result.deletedSampleDrivers ?? 0} คน`,
      );
      const statsResponse = await fetch(`/api/stats/travel?month=${encodeURIComponent(selectedMonth)}`);
      if (statsResponse.ok) {
        const payload: TravelStatsResponse = await statsResponse.json();
        setData(payload);
      }
      window.dispatchEvent(new Event(FEEDBACK_REFRESH_EVENT));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to cleanup sample data');
      }
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <section className={`rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 ${className ?? ''}`}>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#004c80]">สรุปสถิติการเดินทาง</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            เดือน
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 focus:border-[#0076c3] focus:outline-none focus:ring-2 focus:ring-[#0076c3]/30"
            />
          </label>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!data || isLoading}
            className="rounded-lg bg-[#0076c3] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#005b99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleGenerateSample}
            disabled={isGenerating || isCleaning || isLoading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? 'กำลังสร้างข้อมูล...' : 'Generate Sample Data'}
          </button>
          <button
            type="button"
            onClick={handleCleanupSample}
            disabled={isGenerating || isCleaning || isLoading}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCleaning ? 'กำลังลบข้อมูล...' : 'Cleanup Sample Data'}
          </button>
        </div>
      </div>

      {isLoading && <p className="py-10 text-center text-slate-500">กำลังโหลดสถิติการเดินทาง...</p>}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">ระยะทางรวม (km)</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.summary.totalKm.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">จำนวนเที่ยวเสร็จสิ้น</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.summary.completedTrips.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">รถที่ถูกใช้งาน</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.summary.activeVehicles.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">คนขับที่ทำงาน</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.summary.activeDrivers.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">km เฉลี่ย/เที่ยว</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{data.summary.avgKmPerTrip.toLocaleString()}</p>
            </div>
          </div>

          {data.summary.completedTrips === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-slate-500">
              ยังไม่มีงานที่เสร็จสิ้นในเดือนที่เลือก
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4 xl:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-[#004c80]">แนวโน้มจำนวนทริป</h3>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setTrendGranularity('day')}
                      className={`rounded-md px-3 py-1 ${
                        trendGranularity === 'day' ? 'bg-[#0076c3] text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      วัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendGranularity('week')}
                      className={`rounded-md px-3 py-1 ${
                        trendGranularity === 'week' ? 'bg-[#0076c3] text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      สัปดาห์
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendGranularity('month')}
                      className={`rounded-md px-3 py-1 ${
                        trendGranularity === 'month' ? 'bg-[#0076c3] text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      เดือน
                    </button>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tripTrendChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="tripCount"
                        name="จำนวนทริป"
                        stroke="#0076c3"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 xl:col-span-2">
                <h3 className="mb-3 font-semibold text-[#004c80]">ระยะทางรวม vs เวลาเดินทางรวม (ย้อนหลัง 6 เดือน)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.distanceVsDurationByMonth} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="totalKm" fill="#0076c3" name="ระยะทางรวม (km)" radius={[6, 6, 0, 0]} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="totalDurationHours"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        name="เวลาเดินทางรวม (ชั่วโมง)"
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="mb-3 font-semibold text-[#004c80]">ระยะทางที่ใช้ไปในรถยนต์แต่ละคัน</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vehicleKmChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="licensePlate" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalKm" fill="#0076c3" name="ระยะทาง (km)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="mb-3 font-semibold text-[#004c80]">จำนวนงานของคนขับ</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={driverJobsChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="driverName" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tripCount" fill="#22c55e" name="จำนวนเที่ยว" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            รายการที่คำนวณระยะทางไม่ได้ (ไม่มีเลขไมล์ต้นทาง/ปลายทาง): {data.meta.missingMileageTrips}
          </p>
        </>
      )}
    </section>
  );
}
