'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Booking {
  id: string;
  purpose: string | null;
  startLocation: string | null;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    name: string | null;
    email: string;
    position: string | null;
  };
  vehicle: {
    licensePlate: string;
    brand: string | null;
    model: string | null;
    type: string | null;
  } | null;
  driver: {
    name: string | null;
  } | null;
  adminApprover: {
    name: string | null;
  } | null;
  executiveConfirmer: {
    name: string | null;
  } | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'อนุมัติแล้ว' },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-700', label: 'ปฏิเสธ' },
    CONFIRMED: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'ยืนยันแล้ว' },
    IN_PROGRESS: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'กำลังเดินทาง' },
    COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'เสร็จสิ้น' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'ยกเลิก' },
  };
  const p = map[status] || { bg: 'bg-gray-50', text: 'text-gray-700', label: status };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${p.bg} ${p.text} ring-1 ring-black/5`}>{p.label}</span>;
};

export default function AdminHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated' && session?.user?.role !== 'Admin') router.replace('/');
  }, [status, session, router]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (status !== 'authenticated') return;
      
      setIsLoading(true);
      try {
        // ใช้ query parameter ?all=true เพื่อดึงข้อมูล bookings ทั้งหมด
        const response = await fetch('/api/bookings?all=true');
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        const data = await response.json();
        
        // กรองเฉพาะ bookings ที่ admin อนุมัติหรือปฏิเสธ (มี adminApprover)
        const adminBookings = data.filter((booking: Booking) => 
          booking.adminApprover !== null && 
          (booking.status === 'APPROVED' || booking.status === 'REJECTED' || 
           booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS' || 
           booking.status === 'COMPLETED' || booking.status === 'CANCELLED')
        );
        setBookings(adminBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setBookings([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchBookings();
    }
  }, [status, session]);

  const filtered = useMemo(() => {
    let result = bookings;
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(booking => booking.status === statusFilter);
    }
    
    // Filter by search query
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(booking =>
        (booking.purpose || '').toLowerCase().includes(q) ||
        (booking.startLocation || '').toLowerCase().includes(q) ||
        (booking.endLocation || '').toLowerCase().includes(q) ||
        (booking.requester.name || '').toLowerCase().includes(q) ||
        (booking.requester.email || '').toLowerCase().includes(q) ||
        (booking.status || '').toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [bookings, query, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading') return <div className="p-6">Loading...</div>;

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">ประวัติการอนุมัติ</h1>
          <p className="text-gray-700">รายการที่อนุมัติหรือปฏิเสธแล้ว</p>
        </div>

        {/* Filters and Search */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[#0076c3] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              อนุมัติ
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'REJECTED'
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ปฏิเสธ
            </button>
          </div>
          <div className="relative w-full md:w-80">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา: วัตถุประสงค์ จุดเริ่มต้น ปลายทาง หรือสถานะ"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          พบ {filtered.length} รายการจากทั้งหมด {bookings.length} รายการ
        </div>

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Booking Info */}
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Requester Info */}
                        <div>
                          <h3 className="font-semibold text-[#004c80] mb-2">ผู้ขอใช้</h3>
                          <p className="font-medium">{booking.requester.name || '-'}</p>
                          <p className="text-sm text-gray-600">{booking.requester.position || '-'}</p>
                          <p className="text-sm text-gray-500">{booking.requester.email}</p>
                        </div>

                        {/* Trip Details */}
                        <div>
                          <h3 className="font-semibold text-[#004c80] mb-2">รายละเอียดการเดินทาง</h3>
                          <p className="text-sm">
                            <span className="font-medium">จุดเริ่มต้น:</span> {booking.startLocation || '-'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">ปลายทาง:</span> {booking.endLocation || '-'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">วัตถุประสงค์:</span> {booking.purpose || '-'}
                          </p>
                        </div>

                        {/* Schedule */}
                        <div>
                          <h3 className="font-semibold text-[#004c80] mb-2">กำหนดการ</h3>
                          <p className="text-sm">
                            <span className="font-medium">วันที่เริ่ม:</span> {booking.startTime ? formatDate(booking.startTime) : '-'}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">วันที่สิ้นสุด:</span> {booking.endTime ? formatDate(booking.endTime) : '-'}
                          </p>
                        </div>

                        {/* Vehicle & Driver */}
                        <div>
                          <h3 className="font-semibold text-[#004c80] mb-2">ยานพาหนะ & คนขับ</h3>
                          {booking.vehicle ? (
                            <>
                              <p className="text-sm font-medium">{booking.vehicle.licensePlate}</p>
                              <p className="text-sm text-gray-600">
                                {booking.vehicle.brand} {booking.vehicle.model}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">ยังไม่ได้กำหนดรถ</p>
                          )}
                          {booking.driver ? (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">คนขับ:</span> {booking.driver.name}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 mt-1">ยังไม่ได้กำหนดคนขับ</p>
                          )}
                        </div>
                      </div>

                      {/* Executive Confirmer */}
                      {booking.executiveConfirmer && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">ยืนยันโดย:</span> {booking.executiveConfirmer.name}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={booking.status} />
                      <p className="text-xs text-gray-500">
                        อนุมัติเมื่อ: {formatDate(booking.updatedAt)}
                      </p>
                      {/* PDF Print Button */}
                      <button
                        onClick={() => window.open(`/api/bookings/${booking.id}/pdf`, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded shadow text-sm font-medium transition-colors flex items-center gap-1"
                        title="พิมพ์ใบขอรถ"
                      >
                        🖨️ พิมพ์ใบขอรถ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">
                📋
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {bookings.length === 0 ? 'ยังไม่มีประวัติการอนุมัติ' : 'ไม่พบรายการที่ตรงกับคำค้นหา'}
              </h3>
              <p className="text-gray-500">
                {bookings.length === 0
                  ? 'ประวัติการอนุมัติจะแสดงที่นี่เมื่อมีการอนุมัติหรือปฏิเสธคำขอ'
                  : 'ลองปรับคำค้นหาหรือล้างตัวกรอง'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

