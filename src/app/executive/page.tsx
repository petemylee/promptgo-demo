'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

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
        throw new Error('Failed to fetch bookings');
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
      <div className="p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#004c80] mb-2">Executive Dashboard</h1>
        <p className="text-gray-600">ภาพรวมการยืนยันการเดินทางและสถิติ</p>
        {session && (
          <p className="text-sm text-gray-500 mt-2">
            ยินดีต้อนรับ {session.user?.name || 'Executive'}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">รอยืนยัน</p>
              <p className="text-2xl font-bold text-[#004c80]">{stats.pendingApprovals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">ยืนยันแล้วทั้งหมด</p>
              <p className="text-2xl font-bold text-[#004c80]">{stats.totalConfirmed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">ยืนยันเดือนนี้</p>
              <p className="text-2xl font-bold text-[#004c80]">{stats.thisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#004c80]">การเดินทางล่าสุด</h2>
          <Link href="/executive/approvals" className="text-[#0076c3] hover:text-[#005b99] font-medium">
            ดูทั้งหมด →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-[#004c80]/5">
                <th className="text-left py-3 px-4 text-[#004c80] font-medium">ผู้ขอใช้</th>
                <th className="text-left py-3 px-4 text-[#004c80] font-medium">จุดหมาย</th>
                <th className="text-left py-3 px-4 text-[#004c80] font-medium">วันเวลาเริ่ม</th>
                <th className="text-left py-3 px-4 text-[#004c80] font-medium">วันเวลาสิ้นสุด</th>
                <th className="text-left py-3 px-4 text-[#004c80] font-medium">สถานะ</th>
                <th className="text-left py-3 px-4 text-[#004c80] font-medium">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 5).map((booking) => (
                <tr key={booking.id} className="border-b hover:bg-[#0076c3]/5">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{booking.requestForSelf !== false ? (booking.requester.name || '-') : (booking.travelerName || '-')}</p>
                      <p className="text-sm text-gray-500">{booking.requestForSelf !== false ? (booking.requester.position || '-') : (booking.travelerPosition || '-')}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm">{booking.endLocation}</p>
                      <p className="text-xs text-gray-500">{booking.purpose}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {booking.startTime ? formatDate(booking.startTime) : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {booking.endTime ? formatDate(booking.endTime) : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="py-3 px-4">
                    {booking.status === 'APPROVED' && (
                      <Link
                        href={`/executive/approvals/${booking.id}`}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#0076c3] text-white hover:bg-[#005b99] transition-colors"
                      >
                        ยืนยัน
                      </Link>
                    )}
                    {booking.status === 'CONFIRMED' && (
                      <span className="text-sm text-gray-500">ยืนยันแล้ว</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {bookings.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">
              📋
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">ยังไม่มีข้อมูลการเดินทาง</h3>
            <p className="text-gray-500">ข้อมูลการเดินทางจะแสดงที่นี่เมื่อมีการจอง</p>
          </div>
        )}
      </div>
    </div>
  );
}