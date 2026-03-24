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

interface DriverFeedbackItem {
  id: string;
  rating: number;
  driver: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface DriverAggregate {
  driverId: string;
  driverName: string;
  feedbackCount: number;
  avgRating: number;
}

interface FeedbackStatsOverviewProps {
  className?: string;
}

export default function FeedbackStatsOverview({ className }: FeedbackStatsOverviewProps) {
  const [feedbacks, setFeedbacks] = useState<DriverFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchFeedbacks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/driver-feedback');
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to fetch feedback statistics');
        }
        const data: DriverFeedbackItem[] = await response.json();
        if (mounted) setFeedbacks(data);
      } catch (err: unknown) {
        if (!mounted) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchFeedbacks();
    return () => {
      mounted = false;
    };
  }, []);

  const distributionData = useMemo(() => {
    const counts = [1, 2, 3, 4, 5].map((star) => ({
      ratingLabel: `${star} ดาว`,
      count: 0,
    }));

    for (const item of feedbacks) {
      if (item.rating >= 1 && item.rating <= 5) {
        counts[item.rating - 1].count += 1;
      }
    }

    return counts;
  }, [feedbacks]);

  const driverAggregates = useMemo<DriverAggregate[]>(() => {
    const bucket = new Map<string, { total: number; count: number; name: string }>();
    for (const item of feedbacks) {
      const current = bucket.get(item.driver.id);
      const name = item.driver.name?.trim() || item.driver.email;
      if (!current) {
        bucket.set(item.driver.id, { total: item.rating, count: 1, name });
      } else {
        current.total += item.rating;
        current.count += 1;
      }
    }

    return Array.from(bucket.entries()).map(([driverId, value]) => ({
      driverId,
      driverName: value.name,
      feedbackCount: value.count,
      avgRating: Number((value.total / value.count).toFixed(2)),
    }));
  }, [feedbacks]);

  const topDrivers = useMemo(
    () =>
      [...driverAggregates]
        .sort((a, b) => (b.avgRating !== a.avgRating ? b.avgRating - a.avgRating : b.feedbackCount - a.feedbackCount))
        .slice(0, 5),
    [driverAggregates],
  );

  const bottomDrivers = useMemo(
    () =>
      [...driverAggregates]
        .sort((a, b) => (a.avgRating !== b.avgRating ? a.avgRating - b.avgRating : b.feedbackCount - a.feedbackCount))
        .slice(0, 5),
    [driverAggregates],
  );

  const avgRating = useMemo(() => {
    if (feedbacks.length === 0) return 0;
    const total = feedbacks.reduce((sum, item) => sum + item.rating, 0);
    return Number((total / feedbacks.length).toFixed(2));
  }, [feedbacks]);

  return (
    <section className={`rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 ${className ?? ''}`}>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-[#004c80]">สถิติ Feedback คนขับ</h2>
        <p className="text-sm text-slate-600">ภาพรวมคะแนนและแนวโน้มคุณภาพการให้บริการคนขับ</p>
      </div>

      {isLoading && <p className="py-10 text-center text-slate-500">กำลังโหลดสถิติ feedback...</p>}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">จำนวน Feedback</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{feedbacks.length.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">คะแนนเฉลี่ยรวม</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{avgRating.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">คนขับที่มี Feedback</p>
              <p className="mt-2 text-2xl font-bold text-[#004c80]">{driverAggregates.length.toLocaleString()}</p>
            </div>
          </div>

          {feedbacks.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-slate-500">
              ยังไม่มีข้อมูล feedback สำหรับการวิเคราะห์
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4 xl:col-span-1">
                <h3 className="mb-3 font-semibold text-[#004c80]">สัดส่วนคะแนน 1-5 ดาว</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ratingLabel" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="จำนวน feedback" fill="#0076c3" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 xl:col-span-1">
                <h3 className="mb-3 font-semibold text-[#004c80]">Top คนขับคะแนนเฉลี่ยสูงสุด</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topDrivers} margin={{ top: 8, right: 12, left: 0, bottom: 36 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="driverName" interval={0} angle={-20} textAnchor="end" height={55} tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `${value ?? '-'} / 5`} />
                      <Legend />
                      <Bar dataKey="avgRating" name="คะแนนเฉลี่ย" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 xl:col-span-1">
                <h3 className="mb-3 font-semibold text-[#004c80]">Bottom คนขับคะแนนเฉลี่ยต่ำสุด</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bottomDrivers} margin={{ top: 8, right: 12, left: 0, bottom: 36 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="driverName" interval={0} angle={-20} textAnchor="end" height={55} tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `${value ?? '-'} / 5`} />
                      <Legend />
                      <Bar dataKey="avgRating" name="คะแนนเฉลี่ย" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
