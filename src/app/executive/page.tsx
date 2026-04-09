'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import TravelStatsOverview from '@/components/dashboard/TravelStatsOverview';
import FeedbackStatsOverview from '@/components/dashboard/FeedbackStatsOverview';
import { routeTextWrapClass } from '@/components/booking/routeTextWrap';

interface Booking {
  id: string;
  purpose: string | null;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  createdAt: string;
  requestForSelf?: boolean | null;
  travelerName?: string | null;
  travelerPosition?: string | null;
  requester: {
    name: string | null;
    email: string;
    position: string | null;
  };
  adminApprover: {
    name: string | null;
  } | null;
  vehicle: {
    licensePlate: string;
    brand: string | null;
    model: string | null;
  } | null;
  driver: {
    name: string | null;
  } | null;
}

export default function ExecutiveDashboard() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    totalConfirmed: 0,
    thisMonth: 0
  });

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลการจองได้');
      }
      const data = await response.json();
      setBookings(data);
      
      // Calculate stats
      const pendingApprovals = data.filter((b: Booking) => b.status === 'APPROVED').length;
      const totalConfirmed = data.filter((b: Booking) => b.status === 'CONFIRMED').length;
      const thisMonth = data.filter((b: Booking) => {
        const bookingDate = new Date(b.createdAt);
        const now = new Date();
        return bookingDate.getMonth() === now.getMonth() && 
               bookingDate.getFullYear() === now.getFullYear() &&
               b.status === 'CONFIRMED';
      }).length;

      setStats({ pendingApprovals, totalConfirmed, thisMonth });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // Set empty data on error
      setBookings([]);
      setStats({ pendingApprovals: 0, totalConfirmed: 0, thisMonth: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'รอการอนุมัติ' },
      APPROVED: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'รอยืนยัน' },
      CONFIRMED: { bg: 'bg-green-50', text: 'text-green-700', label: 'ยืนยันแล้ว' },
      REJECTED: { bg: 'bg-red-50', text: 'text-red-700', label: 'ปฏิเสธ' },
      IN_PROGRESS: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'กำลังดำเนินการ' },
      COMPLETED: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'เสร็จสิ้น' },
      CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'ยกเลิก' },
      MERGED: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'รวมการเดินทาง' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.bg} ${config.text} ring-1 ring-black/5`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded-xl w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#004c80] mb-1.5">แดชบอร์ดผู้บริหาร</h1>
        <p className="text-slate-600">ภาพรวมการยืนยันการเดินทางและสถิติ</p>
        {session && (
          <p className="text-sm text-slate-500 mt-2">
            ยินดีต้อนรับ {session.user?.name || 'ผู้บริหาร'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#0076c3]/10">
              <svg className="w-6 h-6 text-[#0076c3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">รอยืนยัน</p>
              <p className="text-2xl font-bold text-[#004c80]">{stats.pendingApprovals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-100">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">ยืนยันแล้วทั้งหมด</p>
              <p className="text-2xl font-bold text-[#004c80]">{stats.totalConfirmed}</p>
            </div>
          </div>
        </div>

        <Link
          href="/executive/admin-approvals"
          className="group bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0076c3]/50"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-100">
              <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600">อนุมัติและจัดสรรรถยนต์</p>
              <p className="text-lg font-bold text-[#004c80] group-hover:text-[#0076c3] transition-colors">ดูคำขอรออนุมัติ</p>
              <p className="text-xs text-slate-500 mt-1">รายการคำขอที่รอการอนุมัติเบื้องต้น</p>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-violet-100">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">ยืนยันเดือนนี้</p>
              <p className="text-2xl font-bold text-[#004c80]">{stats.thisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      <TravelStatsOverview role="Executive" className="mb-8" />
      <FeedbackStatsOverview className="mb-8" />

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-6 pb-4">
          <h2 className="text-xl font-semibold text-[#004c80]">การเดินทางล่าสุด</h2>
          <Link href="/executive/approvals" className="text-[#0076c3] hover:text-[#004c80] font-medium text-sm transition-colors">
            ดูทั้งหมด →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left py-3.5 px-4 text-sm font-medium text-[#004c80]">ผู้ขอใช้</th>
                <th className="text-left py-3.5 px-4 text-sm font-medium text-[#004c80]">จุดหมาย</th>
                <th className="text-left py-3.5 px-4 text-sm font-medium text-[#004c80]">วันเวลาเริ่ม</th>
                <th className="text-left py-3.5 px-4 text-sm font-medium text-[#004c80]">วันเวลาสิ้นสุด</th>
                <th className="text-left py-3.5 px-4 text-sm font-medium text-[#004c80]">สถานะ</th>
                <th className="text-left py-3.5 px-4 text-sm font-medium text-[#004c80]">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 5).map((booking) => (
                <tr key={booking.id} className="border-b border-slate-100 last:border-0 hover:bg-[#0076c3]/5 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-medium text-slate-800">{booking.requestForSelf !== false ? (booking.requester.name || '-') : (booking.travelerName || '-')}</p>
                      <p className="text-sm text-slate-500">{booking.requestForSelf !== false ? (booking.requester.position || '-') : (booking.travelerPosition || '-')}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-[18rem] align-top">
                    <div className={routeTextWrapClass}>
                      <p className="text-sm text-slate-800">{booking.endLocation}</p>
                      <p className="text-xs text-slate-500">{booking.purpose}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-slate-600">
                    {booking.startTime ? formatDate(booking.startTime) : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-sm text-slate-600">
                    {booking.endTime ? formatDate(booking.endTime) : '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="py-3.5 px-4">
                    {booking.status === 'APPROVED' && (
                      <Link
                        href={`/executive/approvals/${booking.id}`}
                        className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-[#0076c3] text-white hover:bg-[#005b99] transition-colors"
                      >
                        ยืนยัน
                      </Link>
                    )}
                    {booking.status === 'CONFIRMED' && (
                      <span className="text-sm text-slate-500">ยืนยันแล้ว</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {bookings.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#0076c3]/10 text-[#0076c3] grid place-items-center text-2xl">
              📋
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">ยังไม่มีข้อมูลการเดินทาง</h3>
            <p className="text-slate-500">ข้อมูลการเดินทางจะแสดงที่นี่เมื่อมีการจอง</p>
          </div>
        )}
      </div>
    </div>
  );
}