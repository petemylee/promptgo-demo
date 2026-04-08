'use client';

import { useState, useEffect } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import TravelStatsOverview from '@/components/dashboard/TravelStatsOverview';
import FeedbackStatsOverview from '@/components/dashboard/FeedbackStatsOverview';
import type { DashboardCounts } from '@/types/approvals';

interface DashboardData {
  counts: DashboardCounts;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings?adminDashboard=true');
      if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลได้');
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) return <div className="p-4 md:p-8"><LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูล..." /></div>;
  if (error) return <p className="p-4 md:p-8 text-red-500">ข้อผิดพลาด: {error}</p>;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-[#004c80]">แดชบอร์ด</h1>
        <p className="text-gray-700">ภาพรวมสถานะคำขอ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#0076c3]/10" />
          <h3 className="text-sm font-medium text-gray-500">รอการพิจารณา</h3>
          <p className="mt-2 text-4xl font-extrabold text-[#004c80]">{data?.counts.pending ?? 0}</p>
          <p className="mt-1 text-xs text-gray-400">รอการพิจารณา</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10" />
          <h3 className="text-sm font-medium text-gray-500">รอการยืนยัน</h3>
          <p className="mt-2 text-4xl font-extrabold text-[#004c80]">{data?.counts.approved ?? 0}</p>
          <p className="mt-1 text-xs text-gray-400">รอการยืนยัน</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/10" />
          <h3 className="text-sm font-medium text-gray-500">กำลังเดินทาง</h3>
          <p className="mt-2 text-4xl font-extrabold text-[#004c80]">{data?.counts.inProgress ?? 0}</p>
          <p className="mt-1 text-xs text-gray-400">กำลังเดินทาง</p>
        </div>
      </div>

      <TravelStatsOverview role="Admin" className="mb-6" />
      <FeedbackStatsOverview className="mb-6" />
    </div>
  );
}