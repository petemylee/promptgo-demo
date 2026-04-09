'use client';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import SignaturePad from './SignaturePad';
import { requesterMayCancelBooking, requesterMayEditBookingDetails } from '@/lib/bookingRequesterWorkflow';
import BookingSummaryHeader from '@/components/booking/BookingSummaryHeader';
import NextStepCallout from '@/components/booking/NextStepCallout';
import { routeTextWrapClass } from '@/components/booking/routeTextWrap';
import { formatDateTimeTHLong } from '@/lib/formatters';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onUpdated: () => void;
  onCancelRequest?: (bookingId: string) => void;
  onEditRequest?: (bookingId: string) => void;
  variant?: 'overlay' | 'fullpage';
}

interface BookingDetail {
  id: string;
  purpose: string | null;
  startLocation: string | null;
  endLocation: string | null;
  additionalNotes: string | null;
  startTime: string | null;
  endTime: string | null;
  passengerCount: number | null;
  tripType: string | null;
  status: string;
  startMileage?: number | null;
  endMileage?: number | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  requesterSignatureUrl: string | null;
  requestForSelf?: boolean | null;
  travelerName?: string | null;
  travelerPosition?: string | null;
  travelerPhone?: string | null;
  requester: {
    name: string | null;
    email: string;
    position: string | null;
    phoneNumber: string | null;
  };
  vehicle: {
    licensePlate: string;
    brand: string | null;
    color: string | null;
    model: string | null;
    vehicleImageUrl?: string | null;
  } | null;
  driver: {
    name: string | null;
    email: string;
    phoneNumber: string | null;
    profileImageUrl?: string | null;
  } | null;
  adminApprover: {
    name: string | null;
  } | null;
  executiveConfirmer: {
    name: string | null;
  } | null;
}

export default function BookingDetailModal({ isOpen, onClose, bookingId, onUpdated, onCancelRequest, onEditRequest, variant = 'overlay' }: BookingDetailModalProps) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  const fetchBookingDetails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
      const data = await response.json();
      setBooking(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBookingDetails();
    }
  }, [isOpen, bookingId, fetchBookingDetails]);

  useEffect(() => {
    if (!isOpen || variant !== 'overlay') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, variant]);

  const handleSaveSignature = async (dataUrl: string) => {
    if (!dataUrl) {
      setError('กรุณาเซ็นลายเซ็นก่อนบันทึก');
      return;
    }

    setIsUploadingSignature(true);
    setError('');

    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const signatureFormData = new FormData();
      signatureFormData.append('signature', blob, 'signature.png');

      const signatureResponse = await fetch('/api/upload/requester-signature', {
        method: 'POST',
        body: signatureFormData,
      });

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'ไม่สามารถอัปโหลดลายเซ็นได้');
      }

      const signatureData = await signatureResponse.json();
      const requesterSignatureUrl = signatureData.url;

      // Update booking with new signature
      const updateResponse = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterSignatureUrl }),
      });

      if (!updateResponse.ok) {
        throw new Error('ไม่สามารถอัปเดตลายเซ็นได้');
      }

      setIsEditingSignature(false);
      await fetchBookingDetails();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const formatDate = (dateString: string | null) => formatDateTimeTHLong(dateString);

  if (!isOpen) return null;

  const distanceTraveledKm =
    booking?.startMileage != null && booking?.endMileage != null
      ? Math.max(0, booking.endMileage - booking.startMileage)
      : null;

  const Section = ({
    title,
    defaultOpen,
    children,
  }: {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
  }) => {
    return (
      <details
        className="rounded-2xl border border-slate-200/70 bg-white shadow-sm ring-1 ring-black/5"
        open={defaultOpen}
      >
        <summary className="cursor-pointer list-none select-none px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[#004c80]">{title}</h3>
            <span className="text-slate-500" aria-hidden>
              ▾
            </span>
          </div>
        </summary>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
      </details>
    );
  };

  const detailBody = (
    <>
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0076c3] mx-auto"></div>
          <p className="mt-4 text-slate-600">กำลังโหลดข้อมูล...</p>
        </div>
      ) : error && !booking ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ปิด
          </button>
        </div>
      ) : booking ? (
        <div className="space-y-6">
            <div className="space-y-3">
              <BookingSummaryHeader
                status={booking.status}
                startLocation={booking.startLocation}
                endLocation={booking.endLocation}
                startTime={booking.startTime}
                endTime={booking.endTime}
                vehicle={booking.vehicle ? { licensePlate: booking.vehicle.licensePlate } : null}
                driver={booking.driver ? { name: booking.driver.name || booking.driver.email } : null}
              />
              <NextStepCallout
                role="Requester"
                status={booking.status}
                hasVehicle={!!booking.vehicle}
                hasDriver={!!booking.driver}
                rejectionReason={booking.rejectionReason ?? null}
              />
            </div>

            {/* การทำรายการ (ผู้ขอใช้รถ) — โชว์ไว้ด้านบนเพื่อลดการเลื่อน */}
            {((onEditRequest && requesterMayEditBookingDetails(booking.status)) ||
              (onCancelRequest && requesterMayCancelBooking(booking.status))) && (
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm ring-1 ring-black/5">
                <h3 className="font-semibold text-[#004c80] mb-2">ทำรายการ</h3>
                <div className="flex flex-wrap gap-2">
                  {onEditRequest && requesterMayEditBookingDetails(booking.status) && (
                    <button
                      type="button"
                      onClick={() => onEditRequest(bookingId)}
                      className="flex-1 min-w-[140px] rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      แก้ไขรายละเอียด
                    </button>
                  )}
                  {onCancelRequest && requesterMayCancelBooking(booking.status) && (
                    <button
                      type="button"
                      onClick={() => onCancelRequest(bookingId)}
                      className="flex-1 min-w-[140px] rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      ยกเลิกคำขอ
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  ถ้ารายการถูกปฏิเสธ ให้กด “แก้ไขรายละเอียด” แล้วส่งใหม่อีกครั้ง
                </p>
              </div>
            )}

            <Section title="ข้อมูลผู้เดินทาง" defaultOpen>
              <div className="space-y-1 text-slate-900">
                <p><span className="font-medium">ชื่อ:</span> {booking.requestForSelf !== false ? (booking.requester.name || '-') : (booking.travelerName || '-')}</p>
                <p><span className="font-medium">ตำแหน่ง:</span> {booking.requestForSelf !== false ? (booking.requester.position || '-') : (booking.travelerPosition || '-')}</p>
                <p><span className="font-medium">เบอร์โทร:</span> {booking.requestForSelf !== false ? (booking.requester.phoneNumber || '-') : (booking.travelerPhone || '-')}</p>
                {booking.requestForSelf === false && (
                  <p className="mt-2 text-sm text-slate-500"><span className="font-medium">ผู้สร้างคำขอ:</span> {booking.requester.name} ({booking.requester.email})</p>
                )}
              </div>
            </Section>

            <Section title="รายละเอียดการเดินทาง" defaultOpen>
              <div className={`space-y-1 text-slate-900 ${routeTextWrapClass}`}>
                <p><span className="font-medium">ต้นทาง:</span> {booking.startLocation || '-'}</p>
                <p><span className="font-medium">ปลายทาง:</span> {booking.endLocation || '-'}</p>
                <p><span className="font-medium">วัตถุประสงค์:</span> {booking.purpose || '-'}</p>
                {booking.tripType && (
                  <p><span className="font-medium">ประเภทการเดินทาง:</span> {
                    booking.tripType === 'ONE_WAY' || booking.tripType === 'PICK_UP' ? 'ส่ง' :
                    booking.tripType === 'ROUND_TRIP' ? 'ส่ง/รับกลับ' :
                    booking.tripType
                  }</p>
                )}
                {booking.passengerCount && (
                  <p><span className="font-medium">จำนวนคนนั่ง:</span> {booking.passengerCount} คน</p>
                )}
              </div>
            </Section>

            {/* หมายเหตุเพิ่มเติม - แยกกล่องให้โดดเด่น */}
            {booking.additionalNotes && (
              <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-lg">
                <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <span className="text-amber-600" aria-hidden>📌</span>
                  หมายเหตุเพิ่มเติม
                </h3>
                <p className="text-gray-800 whitespace-pre-wrap">{booking.additionalNotes}</p>
              </div>
            )}

            <Section title="กำหนดการ">
              <div className="space-y-1 text-slate-900">
                <p><span className="font-medium">วันเวลาเริ่ม:</span> {formatDate(booking.startTime)}</p>
                <p><span className="font-medium">วันเวลาสิ้นสุด:</span> {formatDate(booking.endTime)}</p>
              </div>
            </Section>

            <Section title="เลขไมล์และระยะทาง">
              <div className="space-y-1 text-slate-900">
                <p>
                  <span className="font-medium">เลขไมล์ก่อนออกเดินทาง:</span>{' '}
                  {booking.startMileage != null ? `${booking.startMileage.toLocaleString('th-TH')} กม.` : '-'}
                </p>
                <p>
                  <span className="font-medium">เลขไมล์หลังเดินทาง:</span>{' '}
                  {booking.endMileage != null ? `${booking.endMileage.toLocaleString('th-TH')} กม.` : '-'}
                </p>
                <p>
                  <span className="font-medium">ระยะทางที่ใช้ไป:</span>{' '}
                  {distanceTraveledKm != null ? `${distanceTraveledKm.toLocaleString('th-TH')} กม.` : '-'}
                </p>
              </div>
            </Section>

            {/* Vehicle & Driver */}
            {(booking.vehicle || booking.driver) && (
              <Section title="รถและคนขับ">
                <div className="space-y-4">
                  {booking.vehicle && (
                    <div className="rounded-xl bg-slate-50 p-3 text-slate-900">
                      <div className="font-semibold text-[#004c80] mb-2">ยานพาหนะ</div>
                      {booking.vehicle.vehicleImageUrl && (
                        <div className="mb-3">
                          <Image
                            src={booking.vehicle.vehicleImageUrl}
                            alt="Vehicle Photo"
                            width={320}
                            height={200}
                            sizes="(max-width: 640px) 100vw, 320px"
                            className="rounded-lg object-cover ring-1 ring-black/10"
                            style={{ width: '100%', height: 'auto' }}
                          />
                        </div>
                      )}
                      <p className="font-medium">{booking.vehicle.licensePlate}</p>
                      <p className="text-sm text-slate-700">{booking.vehicle.brand} {booking.vehicle.model}</p>
                      <p className="text-sm text-slate-600">สีรถ: {booking.vehicle.color || '-'}</p>
                    </div>
                  )}

                  {booking.driver && (
                    <div className="rounded-xl bg-slate-50 p-3 text-slate-900">
                      <div className="font-semibold text-[#004c80] mb-2">คนขับ</div>
                      {booking.driver.profileImageUrl && (
                        <div className="mb-3">
                          <Image
                            src={booking.driver.profileImageUrl}
                            alt="Driver Photo"
                            width={160}
                            height={160}
                            className="rounded-lg object-cover ring-1 ring-black/10"
                          />
                        </div>
                      )}
                      <p className="font-medium">{booking.driver.name || booking.driver.email}</p>
                      {booking.driver.phoneNumber && (
                        <p className="text-sm text-slate-600">โทร: {booking.driver.phoneNumber}</p>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Status */}
            <Section title="สถานะและการอนุมัติ">
              <div className="space-y-2 text-slate-900">
                {booking.status === 'REJECTED' && (booking.rejectionReason || booking.rejectedAt) && (
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-semibold text-red-800">เหตุผลในการปฏิเสธ</p>
                    <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">
                      {booking.rejectionReason || '-'}
                    </p>
                    {booking.rejectedAt && (
                      <p className="mt-2 text-xs text-red-700/80">
                        อัปเดตเมื่อ: {formatDate(booking.rejectedAt)}
                      </p>
                    )}
                  </div>
                )}
                {booking.adminApprover && (
                  <p className="text-sm text-slate-700">
                    {booking.status === 'REJECTED' ? 'ปฏิเสธโดย' : 'อนุมัติโดย'}: {booking.adminApprover.name}
                  </p>
                )}
                {booking.executiveConfirmer && (
                  <p className="text-sm text-slate-700">ยืนยันโดย: {booking.executiveConfirmer.name}</p>
                )}
                {!booking.adminApprover && !booking.executiveConfirmer && booking.status !== 'REJECTED' && (
                  <p className="text-sm text-slate-600">
                    ยังไม่มีข้อมูลการอนุมัติ/ยืนยัน (สถานะรายการดูได้ที่สรุปด้านบน)
                  </p>
                )}
              </div>
            </Section>

            {/* Signature Section */}
            <Section title="ลายเซ็นผู้ขอใช้">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-slate-700">ลายเซ็น</div>
                {!isEditingSignature && (
                  <button
                    onClick={() => setIsEditingSignature(true)}
                    className="text-sm text-[#0076c3] hover:text-[#005b99] underline"
                  >
                    แก้ไขลายเซ็น
                  </button>
                )}
              </div>

              {isEditingSignature ? (
                <div className="space-y-4">
                  <SignaturePad
                    onSignatureSave={handleSaveSignature}
                    onClear={() => {}}
                    disabled={isUploadingSignature}
                    height={200}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsEditingSignature(false);
                        fetchBookingDetails();
                      }}
                      disabled={isUploadingSignature}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : booking.requesterSignatureUrl ? (
                <div className="mt-2">
                  <Image
                    src={booking.requesterSignatureUrl}
                    alt="Signature"
                    width={300}
                    height={150}
                    className="border rounded-lg object-contain"
                  />
                </div>
              ) : (
                <p className="text-slate-500 text-sm">ยังไม่มีลายเซ็น</p>
              )}
            </Section>

            {error && (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
        </div>
      ) : null}
    </>
  );

  if (variant === 'fullpage') {
    return (
      <div className="w-full max-w-5xl mx-auto rounded-2xl bg-white/90 shadow ring-1 ring-black/5 text-slate-900">
        <div className="bg-white/90 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between rounded-t-2xl">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <span aria-hidden>←</span>
            <span>กลับ</span>
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-[#004c80] flex-1 text-center pr-12">รายละเอียดการจอง</h2>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          {detailBody}
        </div>
      </div>
    );
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] bg-black/40" role="dialog" aria-modal="true" aria-label="รายละเอียดการจอง">
      <div className="bg-white w-full h-[100dvh] shadow-2xl ring-1 ring-black/5 flex flex-col text-slate-900">
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-[#004c80]">รายละเอียดการจอง</h2>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="ปิด"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 py-4 sm:px-6 sm:py-6">
          {detailBody}
        </div>
        <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4 flex justify-end bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
