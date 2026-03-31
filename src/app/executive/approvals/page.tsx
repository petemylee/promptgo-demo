'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
      <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
        {sortedBookings.length > 0 ? (
          <div className="space-y-4">
            {sortedBookings.map((booking) => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Booking Info */}
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* ผู้เดินทาง */}
                      <div>
                        <h3 className="font-semibold text-[#004c80] mb-2">ผู้เดินทาง</h3>
                        <p className="font-medium">{booking.requestForSelf !== false ? booking.requester.name : (booking.travelerName || '-')}</p>
                        <p className="text-sm text-gray-600">{booking.requestForSelf !== false ? booking.requester.position : (booking.travelerPosition || '-')}</p>
                        {booking.requestForSelf === false && (
                          <p className="text-sm text-gray-500">ผู้สร้างคำขอ: {booking.requester.name} ({booking.requester.email})</p>
                        )}
                      </div>

                      {/* Trip Details */}
                      <div>
                        <h3 className="font-semibold text-[#004c80] mb-2">รายละเอียดการเดินทาง</h3>
                        <p className="text-sm">
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">ไป:</span> {booking.endLocation}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">วัตถุประสงค์:</span> {booking.purpose}
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
                          <p className="text-sm">
                            <span className="font-medium">รถ:</span> {booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.licensePlate})
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">ยังไม่ได้กำหนดรถ</p>
                        )}
                        {booking.driver ? (
                          <p className="text-sm">
                            <span className="font-medium">คนขับ:</span> {booking.driver.name}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">ยังไม่ได้กำหนดคนขับ</p>
                        )}
                      </div>
                    </div>

                    {/* Admin Approver */}
                    {booking.adminApprover && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">
                          <span className="font-medium">อนุมัติโดย:</span> {booking.adminApprover.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-black/5">
                      รอยืนยัน
                    </span>
                    <button
                      onClick={() => handleConfirm(booking.id)}
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-[#0076c3] text-white hover:bg-[#005b99] transition-colors font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      ยืนยันการเดินทาง
                    </button>
                  </div>
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

