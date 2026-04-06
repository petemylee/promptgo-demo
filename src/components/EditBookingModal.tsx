'use client';
import { useState, useEffect, useCallback } from 'react';
import SignaturePad from './SignaturePad';
import Image from 'next/image';
import LoadingScreen from '@/components/LoadingScreen';
import { parseBangkokDateTimeLocal, toBangkokDateTimeLocalInput } from '@/lib/dateTime';
import { requesterMayEditBookingDetails } from '@/lib/bookingRequesterWorkflow';

type TripType = 'ONE_WAY' | 'ROUND_TRIP';

interface EditBookingModalProps {
  isOpen?: boolean;
  onClose: () => void;
  bookingId: string;
  onUpdated: () => void;
  variant?: 'modal' | 'fullpage';
}

interface BookingData {
  id: string;
  startLocation: string | null;
  endLocation: string | null;
  purpose: string | null;
  additionalNotes: string | null;
  startTime: string | null;
  endTime: string | null;
  passengerCount: number | null;
  tripType: TripType | null;
  requesterSignatureUrl: string | null;
  passengerImageUrl: string | null;
  status: string;
}

export default function EditBookingModal({ isOpen = true, onClose, bookingId, onUpdated, variant = 'modal' }: EditBookingModalProps) {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [passengerCount, setPassengerCount] = useState('');
  const [tripType, setTripType] = useState<TripType | ''>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [passengerPhotoFile, setPassengerPhotoFile] = useState<File | null>(null);
  const [passengerPhotoPreview, setPassengerPhotoPreview] = useState<string | null>(null);
  const [isUploadingPassengerPhoto, setIsUploadingPassengerPhoto] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [postPendingEditNotice, setPostPendingEditNotice] = useState(false);

  const validateDateTimesLive = (nextStart: string, nextEnd: string) => {
    if (!nextStart || !nextEnd) {
      setError('');
      return;
    }
    const parsedStart = parseBangkokDateTimeLocal(nextStart);
    const parsedEnd = parseBangkokDateTimeLocal(nextEnd);
    if (!parsedStart || !parsedEnd) {
      setError('รูปแบบวันเวลาไม่ถูกต้อง');
      return;
    }
    if (parsedEnd.getTime() < parsedStart.getTime()) {
      setError('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
      return;
    }
    setError('');
  };

  const fetchBookingData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
      const data: BookingData = await response.json();
      
      if (!requesterMayEditBookingDetails(data.status)) {
        setPostPendingEditNotice(false);
        setError('ไม่สามารถแก้ไขคำขอที่อยู่ในสถานะนี้ได้');
        setIsLoadingData(false);
        return;
      }

      setPostPendingEditNotice(data.status !== 'PENDING');
      setStartLocation(data.startLocation || '');
      setDestination(data.endLocation || '');
      setPurpose(data.purpose || '');
      setAdditionalNotes(data.additionalNotes || '');
      setStartTime(toBangkokDateTimeLocalInput(data.startTime));
      setEndTime(toBangkokDateTimeLocalInput(data.endTime));
      setPassengerCount(data.passengerCount?.toString() || '');
      const rawTrip = String(data.tripType ?? '');
      setTripType(rawTrip === 'PICK_UP' ? 'ONE_WAY' : (rawTrip as TripType | ''));
      setSignatureDataUrl(data.requesterSignatureUrl);
      setPassengerPhotoPreview(data.passengerImageUrl);
    } catch (err) {
      setPostPendingEditNotice(false);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoadingData(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBookingData();
    } else {
      // Reset form when modal closes
      setStartLocation('');
      setDestination('');
      setPurpose('');
      setAdditionalNotes('');
      setStartTime('');
      setEndTime('');
      setPassengerCount('');
      setTripType('');
      setError('');
      setSignatureDataUrl(null);
      setPassengerPhotoFile(null);
      setPassengerPhotoPreview(null);
      setPostPendingEditNotice(false);
    }
  }, [isOpen, bookingId, fetchBookingData]);

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setError('');
  };

  const handleSignatureClear = () => {
    setSignatureDataUrl(null);
  };

  const handlePassengerPhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setPassengerPhotoPreview(e.target?.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
      setPassengerPhotoFile(file);
    }
  };

  const removePassengerPhoto = () => {
    setPassengerPhotoFile(null);
    setPassengerPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsedStartTime = parseBangkokDateTimeLocal(startTime);
    const parsedEndTime = parseBangkokDateTimeLocal(endTime);
    if (!parsedStartTime || !parsedEndTime) {
      setError('รูปแบบวันเวลาไม่ถูกต้อง');
      return;
    }
    if (parsedEndTime.getTime() < parsedStartTime.getTime()) {
      setError('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
      return;
    }
    setIsLoading(true);
    setIsUploadingSignature(false);
    setIsUploadingPassengerPhoto(false);

    try {
      // Upload signature if changed
      let requesterSignatureUrl: string | null = null;
      
      if (signatureDataUrl && !signatureDataUrl.startsWith('http')) {
        // New signature from signature pad
        setIsUploadingSignature(true);
        try {
          const response = await fetch(signatureDataUrl);
          const blob = await response.blob();
          
          const signatureFormData = new FormData();
          signatureFormData.append('signature', blob, 'signature.png');

          const signatureResponse = await fetch('/api/upload/requester-signature', {
            method: 'POST',
            body: signatureFormData,
          });

          if (signatureResponse.ok) {
            const signatureData = await signatureResponse.json();
            requesterSignatureUrl = signatureData.url;
          } else {
            const errorData = await signatureResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'ไม่สามารถอัปโหลดลายเซ็นได้');
          }
        } finally {
          setIsUploadingSignature(false);
        }
      } else if (signatureDataUrl) {
        // Keep existing signature URL
        requesterSignatureUrl = signatureDataUrl;
      }

      // Upload passenger photo if changed
      let passengerImageUrl: string | null = null;
      
      if (passengerPhotoFile) {
        setIsUploadingPassengerPhoto(true);
        try {
          const photoFormData = new FormData();
          photoFormData.append('photo', passengerPhotoFile);

          const photoResponse = await fetch('/api/upload/passenger-photo', {
            method: 'POST',
            body: photoFormData,
          });

          if (photoResponse.ok) {
            const photoData = await photoResponse.json();
            passengerImageUrl = photoData.url;
          } else {
            const errorData = await photoResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'ไม่สามารถอัปโหลดรูปภาพผู้โดยสารได้');
          }
        } finally {
          setIsUploadingPassengerPhoto(false);
        }
      } else if (passengerPhotoPreview && passengerPhotoPreview.startsWith('http')) {
        // Keep existing photo URL
        passengerImageUrl = passengerPhotoPreview;
      }

      // Update booking
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLocation,
          endLocation: destination,
          purpose,
          additionalNotes: additionalNotes?.trim() || null,
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          passengerCount: passengerCount ? parseInt(passengerCount, 10) : null,
          tripType: tripType || null,
          requesterSignatureUrl,
          passengerImageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'ไม่สามารถอัปเดตคำขอได้');
      }

      onUpdated();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
      setIsUploadingSignature(false);
      setIsUploadingPassengerPhoto(false);
    }
  };

  if (!isOpen) return null;

  const innerForm = (
    <>
      <div className={`flex-shrink-0 border-b border-gray-200 ${variant === 'fullpage' ? 'px-6 py-4 flex items-center gap-4' : 'px-8 pt-8 pb-4'}`}>
        {variant === 'fullpage' && (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <span aria-hidden>←</span>
            <span>กลับ</span>
          </button>
        )}
        <h2 className={`text-2xl font-bold text-[#004c80] ${variant === 'fullpage' ? 'flex-1' : ''}`}>แก้ไขคำขอใช้รถยนต์ส่วนกลาง</h2>
      </div>
      {isLoadingData ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูล..." />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className={`px-8 py-6 overflow-y-auto space-y-4 flex-1 ${variant === 'fullpage' ? '' : ''}`}>
              {postPendingEditNotice && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  คำขอนี้อนุมัติหรือดำเนินการแล้ว — หลังบันทึก ระบบจะแจ้งให้ผู้ดูแลและคนขับ (ถ้ามี) ทราบถึงการแก้ไข โดยไม่ต้องอนุมัติใหม่
                </div>
              )}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">สถานที่ต้นทาง*</label>
                <input
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">สถานที่ปลายทาง*</label>
                <input 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)} 
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                  required 
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">วันเวลาออกเดินทาง*</label>
                <input 
                  type="datetime-local" 
                  value={startTime} 
                  onChange={(e) => {
                    const next = e.target.value;
                    setStartTime(next);
                    validateDateTimesLive(next, endTime);
                  }} 
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                  required 
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">วันที่สิ้นสุด*</label>
                <input 
                  type="datetime-local" 
                  value={endTime} 
                  min={startTime || undefined}
                  onChange={(e) => {
                    const next = e.target.value;
                    setEndTime(next);
                    validateDateTimesLive(startTime, next);
                  }} 
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                  required 
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">วัตถุประสงค์*</label>
                <textarea 
                  rows={4} 
                  value={purpose} 
                  onChange={(e) => setPurpose(e.target.value)} 
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                  required 
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">หมายเหตุเพิ่มเติม (ไม่บังคับ)</label>
                <textarea 
                  rows={3} 
                  value={additionalNotes} 
                  onChange={(e) => setAdditionalNotes(e.target.value)} 
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                  placeholder="ระบุหมายเหตุเพิ่มเติมถ้ามี"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">ประเภทการเดินทาง*</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tripType"
                      value="ONE_WAY"
                      checked={tripType === 'ONE_WAY'}
                      onChange={(e) => setTripType(e.target.value as TripType)}
                      className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                      required
                    />
                    <span className="text-sm text-gray-700">ส่ง</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tripType"
                      value="ROUND_TRIP"
                      checked={tripType === 'ROUND_TRIP'}
                      onChange={(e) => setTripType(e.target.value as TripType)}
                      className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                      required
                    />
                    <span className="text-sm text-gray-700">ส่ง/รับกลับ</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">จำนวนคนนั่ง*</label>
                <input 
                  type="number" 
                  min="1" 
                  value={passengerCount} 
                  onChange={(e) => setPassengerCount(e.target.value)} 
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                  required 
                  placeholder="ระบุจำนวนคนนั่ง"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">รูปภาพผู้โดยสาร (ไม่บังคับ)</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePassengerPhotoInput}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60 text-sm"
                    disabled={isLoading || isUploadingPassengerPhoto}
                  />
                  {passengerPhotoPreview && (
                    <div className="space-y-2">
                      <div className="relative inline-block">
                        <Image 
                          src={passengerPhotoPreview} 
                          alt="Passenger Photo Preview" 
                          width={200}
                          height={200}
                          className="mx-auto max-h-32 border rounded-lg object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={removePassengerPhoto}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                        disabled={isLoading || isUploadingPassengerPhoto}
                      >
                        ลบรูปภาพ
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">ลายเซ็นผู้ขอใช้รถ (ไม่บังคับ)</label>
                {signatureDataUrl && !signatureDataUrl.startsWith('data:') ? (
                  <div className="space-y-3">
                    <div className="relative inline-block border-2 border-green-300 rounded-lg p-2 bg-green-50/50">
                      <Image 
                        src={signatureDataUrl} 
                        alt="Signature Preview" 
                        width={300}
                        height={150}
                        className="max-h-32 border rounded-lg object-contain"
                      />
                    </div>
                    <p className="text-sm text-green-600 font-medium">✓ มีลายเซ็นแล้ว</p>
                    <button
                      type="button"
                      onClick={() => setSignatureDataUrl(null)}
                      className="text-xs text-red-600 hover:text-red-700 underline"
                      disabled={isLoading || isUploadingSignature}
                    >
                      ลบลายเซ็น
                    </button>
                  </div>
                ) : (
                  <SignaturePad
                    onSignatureSave={handleSignatureSave}
                    onClear={handleSignatureClear}
                    disabled={isLoading || isUploadingSignature}
                    height={200}
                  />
                )}
              </div>
              {error && <p className="text-red-600 text-center text-sm">{error}</p>}
              {isUploadingSignature && <p className="text-blue-600 text-center text-sm">กำลังอัปโหลดลายเซ็น...</p>}
              {isUploadingPassengerPhoto && <p className="text-blue-600 text-center text-sm">กำลังอัปโหลดรูปภาพผู้โดยสาร...</p>}
            </div>
            <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button 
                type="button" 
                onClick={onClose} 
                className="rounded-xl px-4 py-2 ring-1 ring-black/10 bg-white hover:bg-gray-50"
                disabled={isLoading}
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                disabled={isLoading} 
                className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60"
              >
                {isLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        )}
    </>
  );

  if (variant === 'fullpage') {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl bg-white/90 shadow ring-1 ring-black/5 flex flex-col">
        {innerForm}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-md max-h-[90vh] my-auto rounded-2xl bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur flex flex-col">
        {innerForm}
      </div>
    </div>
  );
}
