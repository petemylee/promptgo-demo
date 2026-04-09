// src/app/driver/jobs/[bookingId]/page.tsx
'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { routeTextWrapClass } from '@/components/booking/routeTextWrap';
import BookingSummaryHeader from '@/components/booking/BookingSummaryHeader';
import NextStepCallout from '@/components/booking/NextStepCallout';

interface Booking {
  id: string;
  purpose: string | null;
  additionalNotes: string | null;
  startLocation: string | null;
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
    phoneNumber?: string | null;
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
    color: string | null;
    model: string | null;
    type: string | null;
  } | null;
  driver: {
    name: string | null;
  } | null;
}

export default function JobDetailsPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const fetchBooking = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('ไม่พบข้อมูลงาน');
      }
      const data = await response.json();
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      setError('ไม่สามารถโหลดข้อมูลงานได้');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleStartJob = async () => {
    if (!booking) return;
    if (booking.status !== 'CONFIRMED') {
      setError('งานนี้ยังไม่อยู่ในสถานะที่สามารถเริ่มงานได้');
      return;
    }

    setIsStarting(true);
    setError('');

    try {
      const response = await fetch(`/api/driver/jobs/${bookingId}/start`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ไม่สามารถเริ่มงานได้');
      }

      // Redirect to navigation page
      router.push(`/driver/jobs/${bookingId}/navigate`);
    } catch (error) {
      console.error('Error starting job:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเริ่มงาน');
    } finally {
      setIsStarting(false);
    }
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

  if (error && !booking) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 text-red-600 grid place-items-center">
            ❌
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/driver')}
            className="px-4 py-2 bg-[#0076c3] text-white rounded-lg hover:bg-[#005b99] transition-colors"
          >
            กลับไปหน้า Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const isInProgress = booking.status === 'IN_PROGRESS';
  const isConfirmed = booking.status === 'CONFIRMED';

  return (
    <div className="relative min-h-screen overflow-hidden p-4 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center text-[#0076c3] hover:text-[#005b99]"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            กลับ
          </button>
          <h1 className="text-2xl font-bold text-[#004c80]">รายละเอียดงาน</h1>
          <p className="text-slate-700">ดูสรุปงานและทำงานต่อได้จากหน้านี้</p>
        </div>

        <div className="space-y-4">
          <BookingSummaryHeader
            status={booking.status}
            startLocation={booking.startLocation}
            endLocation={booking.endLocation}
            startTime={booking.startTime}
            endTime={booking.endTime}
            vehicle={booking.vehicle ? { licensePlate: booking.vehicle.licensePlate } : null}
            driver={booking.driver ? { name: booking.driver.name } : null}
          />
          <NextStepCallout role="Driver" status={booking.status} />

          {error && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200/70">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-white/90 p-4 shadow ring-1 ring-black/5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {isInProgress && (
                <Link
                  href={`/driver/jobs/${bookingId}/navigate`}
                  className="inline-flex items-center justify-center rounded-xl bg-[#0076c3] px-4 py-3 text-base font-semibold text-white shadow hover:bg-[#0087de] transition"
                >
                  ทำงานต่อ
                </Link>
              )}
              {isConfirmed && (
                <button
                  type="button"
                  onClick={handleStartJob}
                  disabled={isStarting}
                  className="inline-flex items-center justify-center rounded-xl bg-[#0076c3] px-4 py-3 text-base font-semibold text-white shadow hover:bg-[#0087de] disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {isStarting ? 'กำลังเริ่มงาน...' : 'เริ่มงาน'}
                </button>
              )}
              {!isInProgress && !isConfirmed && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200/70">
                  งานนี้เป็นงานในประวัติ คุณสามารถกด “ดูรายละเอียดเพิ่มเติม” ด้านล่างเพื่อดูข้อมูลทั้งหมดได้
                </div>
              )}
              <button
                type="button"
                onClick={() => router.push('/driver')}
                className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-base font-semibold text-[#004c80] ring-1 ring-slate-200 hover:bg-slate-50 transition"
              >
                กลับหน้า “งานของฉัน”
              </button>
            </div>
          </div>

          <details className="rounded-2xl bg-white/90 p-4 shadow ring-1 ring-black/5" open>
            <summary className="cursor-pointer text-sm font-semibold text-[#004c80]">
              ดูรายละเอียดเพิ่มเติม
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-900 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <div className="text-xs text-slate-600">ผู้เดินทาง</div>
                <div className="font-semibold text-slate-900">
                  {booking.requestForSelf !== false ? booking.requester.name || '-' : booking.travelerName || '-'}
                </div>
                <div className="text-xs text-slate-600">
                  {booking.requestForSelf !== false ? booking.requester.position || '-' : booking.travelerPosition || '-'}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  โทร: {booking.requestForSelf !== false ? booking.requester.phoneNumber || '-' : booking.travelerPhone || '-'}
                </div>
                {booking.requestForSelf === false && (
                  <div className="mt-2 text-xs text-slate-600">
                    ผู้สร้างคำขอ: {booking.requester.name || '-'} ({booking.requester.email})
                  </div>
                )}
              </div>

              <div className={`rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70 ${routeTextWrapClass}`}>
                <div className="text-xs text-slate-600">รายละเอียดการเดินทาง</div>
                <div className="mt-2 space-y-1">
                  <div>
                    <span className="font-medium text-slate-700">จุดเริ่มต้น:</span> {booking.startLocation || '-'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">ปลายทาง:</span> {booking.endLocation || '-'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">วัตถุประสงค์:</span> {booking.purpose || '-'}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <div className="text-xs text-slate-600">ยานพาหนะ</div>
                {booking.vehicle ? (
                  <div className="mt-2 space-y-1">
                    <div>
                      <span className="font-medium text-slate-700">ทะเบียน:</span> {booking.vehicle.licensePlate}
                    </div>
                    <div className="text-xs text-slate-700">
                      {[booking.vehicle.brand, booking.vehicle.model, booking.vehicle.type].filter(Boolean).join(' ')}
                    </div>
                    <div className="text-xs text-slate-700">สี: {booking.vehicle.color || '-'}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-700">-</div>
                )}
              </div>

              {(booking.adminApprover || booking.executiveConfirmer) && (
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                  <div className="text-xs text-slate-600">การอนุมัติ/ยืนยัน</div>
                  <div className="mt-2 space-y-1">
                    <div>
                      <span className="font-medium text-slate-700">อนุมัติโดย:</span> {booking.adminApprover?.name || '-'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">ยืนยันโดย:</span> {booking.executiveConfirmer?.name || '-'}
                    </div>
                  </div>
                </div>
              )}

              {booking.additionalNotes && (
                <div className={`rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200/70 ${routeTextWrapClass} md:col-span-2`}>
                  <div className="text-xs font-semibold text-amber-900">หมายเหตุเพิ่มเติม</div>
                  <div className="mt-1 text-sm text-amber-900 whitespace-pre-wrap">{booking.additionalNotes}</div>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

