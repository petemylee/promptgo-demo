'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import SignaturePad from './SignaturePad';
import {
  parseBangkokDateTimeLocal,
  bangkokStartOfTodayDatetimeLocalString,
  isBeforeBangkokStartOfToday,
} from '@/lib/dateTime';

type TripType = 'ONE_WAY' | 'ROUND_TRIP';

type ExpresswayOption = 'EXPRESSWAY' | 'NO_EXPRESSWAY';

interface BookingFormModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onCreated: () => void;
  variant?: 'modal' | 'fullpage';
}

const DEFAULT_START_LOCATION = 'กระทรวงการคลัง';

export default function BookingFormModal({ isOpen = true, onClose, onCreated, variant = 'modal' }: BookingFormModalProps) {
  type SignatureMode = 'PROFILE' | 'NEW' | 'NONE';
  const [startLocation, setStartLocation] = useState(DEFAULT_START_LOCATION);
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [passengerCount, setPassengerCount] = useState('');
  const [tripType, setTripType] = useState<TripType | ''>('');
  const [expresswayOption, setExpresswayOption] = useState<ExpresswayOption | ''>('');
  const [requestForSelf, setRequestForSelf] = useState(true);
  const [travelerName, setTravelerName] = useState('');
  const [travelerPosition, setTravelerPosition] = useState('');
  const [travelerPhone, setTravelerPhone] = useState('');
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; position: string; phoneNumber: string; signatureImageUrl: string | null } | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('NONE');
  const [saveAsProfileSignature, setSaveAsProfileSignature] = useState(true);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSavingProfileSignature, setIsSavingProfileSignature] = useState(false);

  const minBangkokToday = bangkokStartOfTodayDatetimeLocalString();
  const endDatetimeMin = startTime && startTime >= minBangkokToday ? startTime : minBangkokToday;

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
    if (isBeforeBangkokStartOfToday(parsedStart) || isBeforeBangkokStartOfToday(parsedEnd)) {
      setError('ไม่สามารถเลือกวันเวลาก่อนวันนี้ (เวลาไทย) ได้');
      return;
    }
    if (parsedEnd.getTime() < parsedStart.getTime()) {
      setError('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
      return;
    }
    setError('');
  };

  useEffect(() => {
    const shouldFetch = variant === 'fullpage' || (variant === 'modal' && isOpen);
    if (shouldFetch) {
      fetch('/api/users/me')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setUserProfile({
              id: data.id,
              name: data.name || '',
              position: data.position || '',
              phoneNumber: data.phoneNumber || '',
              signatureImageUrl: data.signatureImageUrl || null,
            });
            setSignatureMode(data.signatureImageUrl ? 'PROFILE' : 'NONE');
          }
        })
        .catch(() => setUserProfile(null));
    }
  }, [variant, isOpen]);

  useEffect(() => {
    if (variant === 'modal' && !isOpen) {
      setStartLocation(DEFAULT_START_LOCATION);
      setDestination('');
      setPurpose('');
      setStartTime('');
      setEndTime('');
      setPassengerCount('');
      setTripType('');
      setExpresswayOption('');
      setRequestForSelf(true);
      setTravelerName('');
      setTravelerPosition('');
      setTravelerPhone('');
      setError('');
      setIsLoading(false);
      setSignatureDataUrl(null);
      setSignatureMode('NONE');
      setSaveAsProfileSignature(true);
      setIsSavingProfileSignature(false);
      setIsUploadingSignature(false);
      setAdditionalNotes('');
    }
  }, [variant, isOpen]);

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setError('');
  };

  const handleSignatureClear = () => {
    setSignatureDataUrl(null);
  };

  const updateProfileSignatureUrl = async (profileSignatureUrl: string): Promise<void> => {
    const userId = userProfile?.id;
    if (!userId) throw new Error('ไม่พบข้อมูลผู้ใช้');
    const updateResponse = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatureImageUrl: profileSignatureUrl }),
    });
    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'ไม่สามารถบันทึกลายเซ็นเข้าข้อมูลส่วนตัวได้');
    }
    setUserProfile((prev) => prev ? ({ ...prev, signatureImageUrl: profileSignatureUrl }) : prev);
  };

  if (variant === 'modal' && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!requestForSelf && (!travelerName?.trim() || !travelerPosition?.trim() || !travelerPhone?.trim())) {
      setError('กรุณากรอกข้อมูลผู้เดินทางให้ครบถ้วน');
      return;
    }
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
    if (isBeforeBangkokStartOfToday(parsedStartTime) || isBeforeBangkokStartOfToday(parsedEndTime)) {
      setError('ไม่สามารถเลือกวันเวลาก่อนวันนี้ (เวลาไทย) ได้');
      return;
    }
    setIsLoading(true);
    setIsUploadingSignature(false);

    try {
      // Upload signature first if exists
      let requesterSignatureUrl: string | null = null;
      
      if (signatureMode === 'NEW' && signatureDataUrl) {
        setIsUploadingSignature(true);
        try {
          // Convert data URL to blob
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
            if (saveAsProfileSignature) {
              await updateProfileSignatureUrl(signatureData.url);
            }
          } else {
            const errorData = await signatureResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'ไม่สามารถอัปโหลดลายเซ็นได้');
          }
        } catch (err: unknown) {
          if (err instanceof Error) {
            throw err;
          }
          throw new Error('เกิดข้อผิดพลาดในการอัปโหลดลายเซ็น');
        } finally {
          setIsUploadingSignature(false);
        }
      } else if (signatureMode === 'PROFILE') {
        requesterSignatureUrl = userProfile?.signatureImageUrl || null;
      } else {
        requesterSignatureUrl = null;
      }

      // Create booking
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLocation,
          endLocation: destination,
          purpose,
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          passengerCount: passengerCount ? parseInt(passengerCount, 10) : null,
          tripType: tripType || null,
          expresswayOption: expresswayOption || null,
          requestForSelf,
          travelerName: requestForSelf ? null : travelerName?.trim() || null,
          travelerPosition: requestForSelf ? null : travelerPosition?.trim() || null,
          travelerPhone: requestForSelf ? null : travelerPhone?.trim() || null,
          requesterSignatureUrl,
          additionalNotes: additionalNotes?.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'ไม่สามารถสร้างคำขอได้');
      }
      onCreated();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
      setIsUploadingSignature(false);
    }
  };

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
        <h2 className={`text-2xl font-bold text-[#004c80] ${variant === 'fullpage' ? 'flex-1' : ''}`}>ขออนุญาตใช้รถยนต์ส่วนกลาง</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className={`px-8 py-6 space-y-4 flex-1 ${variant === 'modal' ? 'overflow-y-auto' : ''}`}>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              ขอใช้สำหรับ<span className="text-red-600">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="requestFor"
                  checked={requestForSelf}
                  onChange={() => { setRequestForSelf(true); setTravelerName(''); setTravelerPosition(''); setTravelerPhone(''); }}
                  className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                />
                <span className="text-sm text-gray-700">ขอใช้สำหรับตนเอง</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="requestFor"
                  checked={!requestForSelf}
                  onChange={() => setRequestForSelf(false)}
                  className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                />
                <span className="text-sm text-gray-700">ขอใช้สำหรับบุคคลอื่น</span>
              </label>
            </div>
          </div>
          {requestForSelf ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">ข้อมูลผู้เดินทาง</p>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div><span className="text-gray-500">ชื่อ-นามสกุล:</span> <span className="text-gray-900">{userProfile?.name || '-'}</span></div>
                <div><span className="text-gray-500">ตำแหน่ง:</span> <span className="text-gray-900">{userProfile?.position || '-'}</span></div>
                <div><span className="text-gray-500">เบอร์โทร:</span> <span className="text-gray-900">{userProfile?.phoneNumber || '-'}</span></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-amber-50/30 p-4">
              <p className="text-sm font-medium text-gray-700">
                ข้อมูลผู้เดินทาง<span className="text-red-600">*</span>
              </p>
              <div>
                <label className="block mb-1 text-sm text-gray-600">
                  ชื่อ-นามสกุล<span className="text-red-600">*</span>
                </label>
                <input value={travelerName} onChange={(e) => setTravelerName(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required={!requestForSelf} placeholder="ระบุชื่อ-นามสกุลผู้เดินทาง" />
              </div>
              <div>
                <label className="block mb-1 text-sm text-gray-600">
                  ตำแหน่ง<span className="text-red-600">*</span>
                </label>
                <input value={travelerPosition} onChange={(e) => setTravelerPosition(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required={!requestForSelf} placeholder="ระบุตำแหน่ง" />
              </div>
              <div>
                <label className="block mb-1 text-sm text-gray-600">
                  เบอร์โทร<span className="text-red-600">*</span>
                </label>
                <input type="tel" value={travelerPhone} onChange={(e) => setTravelerPhone(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required={!requestForSelf} placeholder="ระบุเบอร์โทรศัพท์" />
              </div>
            </div>
          )}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              สถานที่ต้นทาง<span className="text-red-600">*</span>
            </label>
            <input
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              สถานที่ปลายทาง<span className="text-red-600">*</span>
            </label>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              วัตถุประสงค์<span className="text-red-600">*</span>
            </label>
            <textarea rows={4} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">หมายเหตุเพิ่มเติม (ไม่บังคับ)</label>
            <textarea rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" placeholder="ระบุหมายเหตุเพิ่มเติมถ้ามี" />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              จำนวนคนนั่ง<span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={passengerCount}
              onChange={(e) => setPassengerCount(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60"
              required
              placeholder="ระบุจำนวนคนนั่ง"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              วันเวลาออกเดินทาง<span className="text-red-600">*</span>
            </label>
            <input
              type="datetime-local"
              min={minBangkokToday}
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
            <label className="block mb-2 text-sm font-medium text-gray-700">
              วันที่สิ้นสุด<span className="text-red-600">*</span>
            </label>
            <input
              type="datetime-local"
              value={endTime}
              min={endDatetimeMin}
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
            <label className="block mb-2 text-sm font-medium text-gray-700">
              ประเภทการเดินทาง<span className="text-red-600">*</span>
            </label>
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
            <label className="block mb-2 text-sm font-medium text-gray-700">
              การเดินทาง<span className="text-red-600">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="expresswayOption"
                  value="EXPRESSWAY"
                  checked={expresswayOption === 'EXPRESSWAY'}
                  onChange={(e) => setExpresswayOption(e.target.value as ExpresswayOption)}
                  className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                  required
                />
                <span className="text-sm text-gray-700">ใช้ทางด่วน</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="expresswayOption"
                  value="NO_EXPRESSWAY"
                  checked={expresswayOption === 'NO_EXPRESSWAY'}
                  onChange={(e) => setExpresswayOption(e.target.value as ExpresswayOption)}
                  className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                  required
                />
                <span className="text-sm text-gray-700">ไม่ใช้ทางด่วน</span>
              </label>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">ลายเซ็นผู้ขอใช้รถ (ไม่บังคับ)</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="signatureMode"
                  checked={signatureMode === 'PROFILE'}
                  onChange={() => setSignatureMode('PROFILE')}
                  className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                  disabled={!userProfile?.signatureImageUrl}
                />
                <span className={`text-sm ${userProfile?.signatureImageUrl ? 'text-gray-700' : 'text-gray-400'}`}>
                  ใช้ลายเซ็นของฉันจากข้อมูลส่วนตัว {userProfile?.signatureImageUrl ? '' : '(ยังไม่มี)'}
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="signatureMode"
                  checked={signatureMode === 'NEW'}
                  onChange={() => setSignatureMode('NEW')}
                  className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                />
                <span className="text-sm text-gray-700">ใช้ลายเซ็นใหม่เฉพาะคำขอนี้</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="signatureMode"
                  checked={signatureMode === 'NONE'}
                  onChange={() => setSignatureMode('NONE')}
                  className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                />
                <span className="text-sm text-gray-700">ไม่ใช้ลายเซ็น</span>
              </label>
            </div>

            {signatureMode === 'PROFILE' && userProfile?.signatureImageUrl && (
              <div className="space-y-2">
                <Image
                  src={userProfile.signatureImageUrl}
                  alt="Profile Signature"
                  width={300}
                  height={150}
                  className="max-h-32 border rounded-lg object-contain"
                />
                <p className="text-xs text-green-700">จะใช้ลายเซ็นของฉันจากข้อมูลส่วนตัวอัตโนมัติ</p>
              </div>
            )}

            {signatureMode === 'NEW' && (
              <>
                {signatureDataUrl ? (
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
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleSignatureClear}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                        disabled={isLoading || isUploadingSignature || isSavingProfileSignature}
                      >
                        ล้างลายเซ็นใหม่
                      </button>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAsProfileSignature}
                        onChange={(e) => setSaveAsProfileSignature(e.target.checked)}
                        className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                        disabled={isLoading || isUploadingSignature || isSavingProfileSignature}
                      />
                      <span className="text-xs text-gray-700">บันทึกลายเซ็นนี้เป็นลายเซ็นหลักในข้อมูลส่วนตัวด้วย</span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      ระบบจะบันทึกเข้าข้อมูลส่วนตัวตอนกด &quot;สร้างคำขอ&quot; หากติ๊กตัวเลือกนี้ไว้
                    </p>
                  </div>
                ) : (
                  <SignaturePad
                    onSignatureSave={handleSignatureSave}
                    onClear={handleSignatureClear}
                    disabled={isLoading || isUploadingSignature || isSavingProfileSignature}
                    height={200}
                  />
                )}
              </>
            )}

            {!userProfile?.signatureImageUrl && signatureMode !== 'NEW' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                บัญชีนี้ยังไม่มีลายเซ็นในข้อมูลส่วนตัว สามารถเลือก &quot;ใช้ลายเซ็นใหม่เฉพาะคำขอนี้&quot; แล้วกดบันทึกเป็นลายเซ็นส่วนตัวได้
              </div>
            )}
          </div>
          {error && <p className="text-red-600 text-center text-sm">{error}</p>}
          {isUploadingSignature && <p className="text-blue-600 text-center text-sm">กำลังอัปโหลดลายเซ็น...</p>}
        </div>
        <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 ring-1 ring-black/10 bg-white hover:bg-gray-50">ยกเลิก</button>
          <button type="submit" disabled={isLoading} className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60">{isLoading ? 'กำลังบันทึก...' : 'สร้างคำขอ'}</button>
        </div>
      </form>
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

