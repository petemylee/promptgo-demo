'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookingSummaryHeader from '@/components/booking/BookingSummaryHeader';
import { formatDateTimeTHLong } from '@/lib/formatters';

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
  travelerPhone?: string | null;
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

export default function ExecutiveApprovalsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      const data = await response.json();
      // Filter only APPROVED bookings
      const approvedBookings = data.filter((booking: Booking) => booking.status === 'APPROVED');
      setBookings(approvedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (booking.requester.name || '').toLowerCase().includes(q) ||
      (booking.requester.position || '').toLowerCase().includes(q) ||
      (booking.requestForSelf === false && (booking.travelerName || '').toLowerCase().includes(q)) ||
      (booking.endLocation || '').toLowerCase().includes(q) ||
      (booking.purpose || '').toLowerCase().includes(q)
    );
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const aTime = a.startTime ?? a.createdAt;
    const bTime = b.startTime ?? b.createdAt;
    const diff = new Date(bTime).getTime() - new Date(aTime).getTime();
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const formatDate = (dateString: string) => formatDateTimeTHLong(dateString);

  const handleConfirm = (bookingId: string) => {
    router.push(`/executive/approvals/${bookingId}`);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#004c80] mb-2">รอยืนยันการเดินทาง</h1>
        <p className="text-gray-600">รายการการเดินทางที่ผ่านการอนุมัติเบื้องต้นแล้ว รอการยืนยันขั้นสุดท้าย</p>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="text-sm text-gray-600">
          พบ {filteredBookings.length} รายการจากทั้งหมด {bookings.length} รายการ
        </div>
        <div className="relative w-full md:w-80">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา: ชื่อ ตำแหน่ง จุดหมาย หรือวัตถุประสงค์"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white/80 backdrop-blur p-6 rounded-2xl shadow-md ring-1 ring-black/5">
        {sortedBookings.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sortedBookings.map((booking) => (
              <div key={booking.id} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-600">ผู้เดินทาง</div>
                    <div className="font-semibold text-slate-900 truncate">
                      {booking.requestForSelf !== false ? (booking.requester.name || booking.requester.email) : (booking.travelerName || '-')}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {booking.requestForSelf !== false ? (booking.requester.position || '-') : (booking.travelerPosition || '-')}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <BookingSummaryHeader
                    status={booking.status}
                    startLocation={null}
                    endLocation={booking.endLocation}
                    startTime={booking.startTime}
                    endTime={booking.endTime}
                    vehicle={booking.vehicle ? { licensePlate: booking.vehicle.licensePlate } : null}
                    driver={booking.driver ? { name: booking.driver.name } : null}
                  />
                </div>

                {booking.adminApprover && (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200/60">
                    <div className="text-sm text-emerald-800">
                      <span className="font-semibold">อนุมัติเบื้องต้นโดย:</span> {booking.adminApprover.name}
                    </div>
                    <div className="mt-1 text-xs text-emerald-800/80">
                      อัปเดตล่าสุด: {formatDate(booking.createdAt)}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleConfirm(booking.id)}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-[#0076c3] px-4 py-3 text-base font-semibold text-white hover:bg-[#005b99] transition-colors"
                  >
                    ยืนยันการเดินทาง
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">
              ✅
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {bookings.length === 0 ? 'ไม่มีรายการรอยืนยัน' : 'ไม่พบรายการที่ตรงกับคำค้นหา'}
            </h3>
            <p className="text-gray-500">
              {bookings.length === 0 
                ? 'รายการการเดินทางที่รอยืนยันจะแสดงที่นี่' 
                : 'ลองปรับคำค้นหาหรือล้างตัวกรอง'
              }
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

