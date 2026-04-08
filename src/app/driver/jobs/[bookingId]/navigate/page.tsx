// src/app/driver/jobs/[bookingId]/navigate/page.tsx
'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import BookingSummaryHeader from '@/components/booking/BookingSummaryHeader';
import NextStepCallout from '@/components/booking/NextStepCallout';
import { formatDateTimeTHLong } from '@/lib/formatters';

interface Booking {
  id: string;
  purpose: string | null;
  additionalNotes: string | null;
  startLocation: string | null;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  startMileage: number | null;
  endMileage: number | null;
  createdAt: string;
  requestForSelf?: boolean | null;
  travelerName?: string | null;
  travelerPosition?: string | null;
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
    currentMileage: number | null;
  } | null;
}

export default function NavigationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState('');
  const [endMileage, setEndMileage] = useState<string>('');

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

  const handleEndJob = async () => {
    if (!booking) return;

    // ตรวจสอบว่ากรอกเลขไมล์หรือไม่
    const mileageValue = parseInt(endMileage);
    if (!endMileage || isNaN(mileageValue) || mileageValue < 0) {
      setError('กรุณากรอกเลขไมล์ปัจจุบัน');
      return;
    }

    // ตรวจสอบว่า endMileage ต้องมากกว่าหรือเท่ากับ startMileage
    if (booking.startMileage !== null && mileageValue < booking.startMileage) {
      setError(`เลขไมล์หลังเดินทางต้องมากกว่าหรือเท่ากับเลขไมล์ก่อนออกเดินทาง (${booking.startMileage})`);
      return;
    }

    setIsEnding(true);
    setError('');

    try {
      const response = await fetch(`/api/driver/jobs/${bookingId}/end`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endMileage: mileageValue }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ไม่สามารถสิ้นสุดงานได้');
      }

      const result = await response.json();
      
      // แสดงผลระยะทางที่ใช้ไป
      if (result.distanceTraveled !== null) {
        alert(`สิ้นสุดงานสำเร็จ!\nระยะทางที่ใช้ไป: ${result.distanceTraveled} กิโลเมตร`);
      } else {
        alert('สิ้นสุดงานสำเร็จ!');
      }

      // Redirect to dashboard
      router.push('/driver?completed=true');
    } catch (error) {
      console.error('Error ending job:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสิ้นสุดงาน');
      setIsEnding(false);
    }
  };

  const formatDate = (dateString: string) => formatDateTimeTHLong(dateString);

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

  if (!booking || booking.status !== 'IN_PROGRESS') {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-100 text-yellow-600 grid place-items-center">
            ⚠️
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">ไม่สามารถเข้าถึงได้</h3>
          <p className="text-gray-500 mb-4">
            งานนี้ไม่ได้อยู่ในสถานะที่กำลังดำเนินการ หรือไม่พบข้อมูล
          </p>
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

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-[#0076c3] hover:text-[#005b99] mb-4"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          กลับ
        </button>
        <h1 className="text-3xl font-bold text-[#004c80] mb-2">การนำทาง</h1>
        <p className="text-gray-600">สิ้นสุดงานเมื่อถึงปลายทาง</p>
      </div>

      <div className="mb-6 space-y-3">
        <BookingSummaryHeader
          status={booking.status}
          startLocation={booking.startLocation}
          endLocation={booking.endLocation}
          startTime={booking.startTime}
          endTime={booking.endTime}
          vehicle={booking.vehicle ? { licensePlate: booking.vehicle.licensePlate } : null}
        />
        <NextStepCallout role="Driver" status={booking.status} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Job Info & End Job */}
        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <h2 className="text-xl font-semibold text-[#004c80] mb-6">สิ้นสุดงาน</h2>
          
          <div className="space-y-6">
            {/* Notice */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h4 className="font-medium text-blue-900">ข้อควรทราบ</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    เมื่อถึงปลายทางแล้ว กรุณากดปุ่ม &quot;สิ้นสุดงาน&quot; เพื่ออัปเดตสถานะงาน
                  </p>
                </div>
              </div>
            </div>

            {/* Mileage Input */}
            <div>
              <h3 className="font-semibold text-[#004c80] mb-2">เลขไมล์หลังเดินทาง <span className="text-red-500">*</span></h3>
              <input
                type="number"
                value={endMileage}
                onChange={(e) => {
                  setEndMileage(e.target.value);
                  setError('');
                }}
                placeholder="กรอกเลขไมล์ปัจจุบัน"
                min={booking.startMileage || 0}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60"
                required
              />
              {booking.startMileage !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  เลขไมล์ก่อนออกเดินทาง: {booking.startMileage.toLocaleString()} กม.
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* End Job Button */}
            <button
              onClick={handleEndJob}
              disabled={isEnding || !endMileage}
              className="w-full px-4 py-3 rounded-xl bg-[#0076c3] text-white hover:bg-[#005b99] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isEnding ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังสิ้นสุดงาน...
                </div>
              ) : (
                'สิ้นสุดงาน'
              )}
            </button>

            <details className="rounded-2xl border border-slate-200/70 bg-white shadow-sm ring-1 ring-black/5">
              <summary className="cursor-pointer list-none select-none px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#004c80]">รายละเอียดงาน</h3>
                  <span className="text-slate-500" aria-hidden>▾</span>
                </div>
              </summary>
              <div className="px-4 pb-4 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">จุดเริ่มต้น:</span> {booking.startLocation || '-'}</p>
                  <p><span className="font-medium">ปลายทาง:</span> {booking.endLocation || '-'}</p>
                  {booking.purpose && (
                    <p><span className="font-medium">วัตถุประสงค์:</span> {booking.purpose}</p>
                  )}
                </div>

                {booking.additionalNotes && (
                  <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-lg">
                    <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <span className="text-amber-600" aria-hidden>📌</span>
                      หมายเหตุเพิ่มเติม
                    </h3>
                    <p className="text-gray-800 whitespace-pre-wrap">{booking.additionalNotes}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-[#004c80] mb-2">ผู้เดินทาง</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">{booking.requestForSelf !== false ? (booking.requester.name || '-') : (booking.travelerName || '-')}</p>
                      <p className="text-sm text-gray-600">{booking.requestForSelf !== false ? (booking.requester.position || '-') : (booking.travelerPosition || '-')}</p>
                      {booking.requestForSelf === false && (
                        <p className="text-sm text-gray-500">ผู้สร้างคำขอ: {booking.requester.name} ({booking.requester.email})</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#004c80] mb-2">ยานพาหนะ</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      {booking.vehicle ? (
                        <>
                          <p className="font-medium">{booking.vehicle.licensePlate}</p>
                          <p className="text-sm text-gray-600">
                            {booking.vehicle.brand} {booking.vehicle.model}
                          </p>
                          {booking.startMileage !== null && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">เลขไมล์ก่อนออกเดินทาง:</span> {booking.startMileage.toLocaleString()} กม.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500">ยังไม่ได้กำหนดรถ</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-[#004c80] mb-2">กำหนดการ</h3>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">เริ่ม:</span> {booking.startTime ? formatDate(booking.startTime) : '-'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">สิ้นสุด:</span> {booking.endTime ? formatDate(booking.endTime) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

