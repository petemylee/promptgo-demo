'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BookingDetailModal from '@/components/BookingDetailModal';
import BookingSummaryHeader from '@/components/booking/BookingSummaryHeader';
import { formatDateTimeTHLong } from '@/lib/formatters';
import { SIDEBAR_ROUTE_RESET_EVENT, type SidebarRouteResetDetail } from '@/lib/sidebarRouteReset';

type HistoryVariant = 'admin' | 'executive';
type PdfPolicy = 'always' | 'onlyPrintable';

interface Booking {
  id: string;
  purpose: string | null;
  startLocation?: string | null;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  startMileage?: number | null;
  endMileage?: number | null;
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
  executiveConfirmer: {
    name: string | null;
  } | null;
  vehicle: {
    licensePlate: string;
    brand: string | null;
    model: string | null;
    type?: string | null;
  } | null;
  driver: {
    id: string;
    name: string | null;
  } | null;
  driverFeedback?: {
    id: string;
    rating: number;
    comment: string | null;
    requester: { name: string | null };
  } | null;
}

function isPrintableStatus(status: string) {
  return status === 'CONFIRMED' || status === 'IN_PROGRESS' || status === 'COMPLETED';
}

export default function ApprovalConfirmationHistoryPage({
  variant,
  pdfPolicy,
}: {
  variant: HistoryVariant;
  pdfPolicy: PdfPolicy;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDateFrom, setStartDateFrom] = useState(''); // YYYY-MM-DD
  const [startDateTo, setStartDateTo] = useState(''); // YYYY-MM-DD
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (status !== 'authenticated') return;
    setIsLoading(true);
    try {
      const url = '/api/bookings?all=true';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = (await response.json()) as Booking[];

      const historyBookings = data.filter(
        (booking) =>
          (booking.adminApprover !== null || booking.executiveConfirmer !== null) &&
          (booking.status === 'APPROVED' ||
            booking.status === 'REJECTED' ||
            booking.status === 'CONFIRMED' ||
            booking.status === 'IN_PROGRESS' ||
            booking.status === 'COMPLETED' ||
            booking.status === 'CANCELLED')
      );
      setBookings(historyBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (
      status === 'authenticated' &&
      session?.user?.role !== 'Admin' &&
      session?.user?.role !== 'Executive'
    ) {
      router.replace('/');
    }
  }, [status, session, router, variant]);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari fallback
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  useEffect(() => {
    const reset = (e: Event) => {
      const detail = (e as CustomEvent<SidebarRouteResetDetail>).detail;
      if (!detail?.href) return;
      if (detail.href !== pathname) return;
      setIsDetailOpen(false);
      setSelectedBookingId(null);
      setQuery('');
      setStatusFilter('all');
      setStartDateFrom('');
      setStartDateTo('');
    };
    window.addEventListener(SIDEBAR_ROUTE_RESET_EVENT, reset);
    return () => window.removeEventListener(SIDEBAR_ROUTE_RESET_EVENT, reset);
  }, [pathname]);

  useEffect(() => {
    if (status === 'authenticated') fetchBookings();
  }, [status, variant, fetchBookings]);

  const filtered = useMemo(() => {
    let result = bookings;

    if (statusFilter !== 'all') {
      result = result.filter((booking) => booking.status === statusFilter);
    }

    if (startDateFrom || startDateTo) {
      const from = startDateFrom ? new Date(`${startDateFrom}T00:00:00`) : null;
      const to = startDateTo ? new Date(`${startDateTo}T23:59:59.999`) : null;
      result = result.filter((booking) => {
        if (!booking.startTime) return false;
        const t = new Date(booking.startTime).getTime();
        if (Number.isNaN(t)) return false;
        if (from && t < from.getTime()) return false;
        if (to && t > to.getTime()) return false;
        return true;
      });
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((booking) => {
      return (
        (booking.purpose || '').toLowerCase().includes(q) ||
        (booking.startLocation || '').toLowerCase().includes(q) ||
        (booking.endLocation || '').toLowerCase().includes(q) ||
        (booking.requester.name || '').toLowerCase().includes(q) ||
        (booking.requester.email || '').toLowerCase().includes(q) ||
        (booking.requester.position || '').toLowerCase().includes(q) ||
        (booking.requestForSelf === false && (booking.travelerName || '').toLowerCase().includes(q)) ||
        (booking.status || '').toLowerCase().includes(q)
      );
    });
  }, [bookings, statusFilter, startDateFrom, startDateTo, query]);

  const formatDate = (dateString: string) => formatDateTimeTHLong(dateString);

  if (status === 'loading') return <div className="p-6">Loading...</div>;

  // Desktop: show "fullpage" modal style (keeps sidebar visible)
  if (isDetailOpen && selectedBookingId && isDesktop) {
    return (
      <div className="relative min-h-screen overflow-hidden p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <BookingDetailModal
            variant="fullpage"
            isOpen
            onClose={() => {
              setIsDetailOpen(false);
              setSelectedBookingId(null);
            }}
            bookingId={selectedBookingId}
            onUpdated={fetchBookings}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">ประวัติการอนุมัติและยืนยัน</h1>
          <p className="text-gray-700">รายการประวัติการอนุมัติและประวัติการยืนยันทั้งหมด</p>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-[#0076c3] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              อนุมัติ
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ปฏิเสธ
            </button>
            <button
              onClick={() => setStatusFilter('CONFIRMED')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'CONFIRMED' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ยืนยันแล้ว
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'IN_PROGRESS' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              กำลังเดินทาง
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'COMPLETED' ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              เสร็จสิ้น
            </button>
            <button
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'CANCELLED' ? 'bg-slate-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ยกเลิก
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                'ค้นหา: ชื่อ อีเมล จุดเริ่มต้น ปลายทาง วัตถุประสงค์ หรือสถานะ'
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5">
            <div className="text-xs font-semibold text-slate-700">ช่วงวันเวลาเริ่มเดินทาง</div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-600">
                จากวันที่
                <input
                  type="date"
                  value={startDateFrom}
                  onChange={(e) => setStartDateFrom(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                />
              </label>
              <label className="text-xs text-slate-600">
                ถึงวันที่
                <input
                  type="date"
                  value={startDateTo}
                  onChange={(e) => setStartDateTo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5 md:col-span-2">
            <div className="text-xs font-semibold text-slate-700">ตัวกรอง</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setStartDateFrom('');
                  setStartDateTo('');
                  setStatusFilter('all');
                }}
                className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 font-semibold text-[#004c80] ring-1 ring-slate-200 hover:bg-slate-50 transition"
              >
                ล้างตัวกรอง
              </button>
              <span className="text-slate-500">* ช่วงวันที่นับจากวันเวลาเริ่มเดินทาง (startTime)</span>
            </div>
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
                <div
                  key={booking.id}
                  className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                        <div className="text-xs text-slate-600">ผู้เดินทาง</div>
                        <div className="font-semibold text-slate-900">
                          {booking.requestForSelf !== false
                            ? booking.requester.name || '-'
                            : booking.travelerName || '-'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {booking.requestForSelf !== false
                            ? booking.requester.position || '-'
                            : booking.travelerPosition || '-'}
                        </div>
                        {booking.requestForSelf === false && (
                          <div className="mt-2 text-xs text-slate-600">
                            ผู้สร้างคำขอ: {booking.requester.name || '-'} ({booking.requester.email})
                          </div>
                        )}
                      </div>

                      <BookingSummaryHeader
                        status={booking.status}
                        startLocation={booking.startLocation ?? null}
                        endLocation={booking.endLocation}
                        startTime={booking.startTime}
                        endTime={booking.endTime}
                        vehicle={booking.vehicle ? { licensePlate: booking.vehicle.licensePlate } : null}
                        driver={booking.driver ? { name: booking.driver.name } : null}
                      />

                      <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                          ดูรายละเอียดเพิ่มเติม
                        </summary>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-900 md:grid-cols-2">
                          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                            <div className="text-xs text-slate-600">วัตถุประสงค์</div>
                            <div className="font-medium text-slate-900">{booking.purpose || '-'}</div>
                          </div>

                          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                            <div className="text-xs text-slate-600">ระยะทางที่ใช้ไป</div>
                            <div className="font-medium text-slate-900">
                              {booking.startMileage != null && booking.endMileage != null
                                ? `${Math.max(0, booking.endMileage - booking.startMileage).toLocaleString('th-TH')} กม.`
                                : '-'}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              เลขไมล์: {booking.startMileage != null ? booking.startMileage.toLocaleString('th-TH') : '-'} →{' '}
                              {booking.endMileage != null ? booking.endMileage.toLocaleString('th-TH') : '-'}
                            </div>
                          </div>

                          {(booking.adminApprover || booking.executiveConfirmer) && (
                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                              <div className="text-xs text-slate-600">การอนุมัติ/ยืนยัน</div>
                              <div className="mt-1 space-y-1 text-sm text-slate-900">
                                <div>
                                  <span className="font-medium text-slate-700">อนุมัติโดย:</span>{' '}
                                  <span>{booking.adminApprover?.name || '-'}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-slate-700">ยืนยันโดย:</span>{' '}
                                  <span>{booking.executiveConfirmer?.name || '-'}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {booking.driverFeedback && (
                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/70 md:col-span-2">
                              <div className="text-xs text-slate-600">ข้อเสนอแนะคนขับ</div>
                              <div className="mt-1 text-sm text-slate-900">
                                <span className="font-medium">
                                  {'⭐'.repeat(booking.driverFeedback.rating)} ({booking.driverFeedback.rating}/5)
                                </span>
                                {booking.driverFeedback.requester?.name && (
                                  <span className="text-slate-600"> โดย {booking.driverFeedback.requester.name}</span>
                                )}
                              </div>
                              {booking.driverFeedback.comment && (
                                <div className="mt-1 text-sm text-slate-800">{booking.driverFeedback.comment}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:w-[320px] md:grid-cols-1 md:self-end">
                      <div className="text-right md:text-left text-xs text-slate-500 md:order-last">
                        อัปเดตล่าสุด: {formatDate(booking.updatedAt ? booking.updatedAt : booking.createdAt)}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookingId(booking.id);
                          setIsDetailOpen(true);
                        }}
                        className="col-span-2 md:col-span-1 inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#004c80] ring-1 ring-slate-200 hover:bg-slate-50 transition"
                      >
                        ดูรายละเอียด
                      </button>

                      {(pdfPolicy === 'always' ||
                        (pdfPolicy === 'onlyPrintable' && isPrintableStatus(booking.status))) && (
                        <button
                          type="button"
                          onClick={() => window.open(`/api/bookings/${booking.id}/pdf`, '_blank')}
                          className="col-span-2 md:col-span-1 inline-flex items-center justify-center rounded-xl bg-[#0076c3] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#0087de] transition"
                          title="พิมพ์ใบขอรถ"
                        >
                          พิมพ์ใบขอรถ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">📋</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {bookings.length === 0 ? 'ยังไม่มีประวัติรายการ' : 'ไม่พบรายการที่ตรงกับคำค้นหา'}
              </h3>
              <p className="text-gray-500">
                {bookings.length === 0
                  ? 'ประวัติการอนุมัติและยืนยันจะแสดงที่นี่'
                  : 'ลองปรับคำค้นหาหรือล้างตัวกรอง'}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedBookingId && (
        <BookingDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedBookingId(null);
          }}
          bookingId={selectedBookingId}
          onUpdated={fetchBookings}
        />
      )}
    </div>
  );
}

