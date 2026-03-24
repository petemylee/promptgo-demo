'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import SignaturePad from './SignaturePad';

type TripType = 'ONE_WAY' | 'PICK_UP' | 'ROUND_TRIP';

type ExpresswayOption = 'EXPRESSWAY' | 'NO_EXPRESSWAY';

interface BookingFormModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onCreated: () => void;
  variant?: 'modal' | 'fullpage';
}

export default function BookingFormModal({ isOpen = true, onClose, onCreated, variant = 'modal' }: BookingFormModalProps) {
  type SignatureMode = 'PROFILE' | 'NEW' | 'NONE';
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
  const [passengerPhotoFile, setPassengerPhotoFile] = useState<File | null>(null);
  const [passengerPhotoPreview, setPassengerPhotoPreview] = useState<string | null>(null);
  const [isUploadingPassengerPhoto, setIsUploadingPassengerPhoto] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSavingProfileSignature, setIsSavingProfileSignature] = useState(false);

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
      setPassengerPhotoFile(null);
      setPassengerPhotoPreview(null);
      setIsUploadingPassengerPhoto(false);
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

  const saveSignatureToProfile = async (): Promise<void> => {
    if (!signatureDataUrl) return;
    setIsSavingProfileSignature(true);
    try {
      const signatureBlobResponse = await fetch(signatureDataUrl);
      const blob = await signatureBlobResponse.blob();
      const signatureFormData = new FormData();
      signatureFormData.append('signature', blob, 'signature.png');

      const uploadResponse = await fetch('/api/upload/requester-signature', {
        method: 'POST',
        body: signatureFormData,
      });
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'ไม่สามารถอัปโหลดลายเซ็นได้');
      }
      const uploadData = await uploadResponse.json();
      const profileSignatureUrl = uploadData.url as string;
      await updateProfileSignatureUrl(profileSignatureUrl);
      setSignatureDataUrl(null);
      setSignatureMode('PROFILE');
    } finally {
      setIsSavingProfileSignature(false);
    }
  };

  const handlePassengerPhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)');
        return;
      }
      // Create preview
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

  if (variant === 'modal' && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!requestForSelf && (!travelerName?.trim() || !travelerPosition?.trim() || !travelerPhone?.trim())) {
      setError('กรุณากรอกข้อมูลผู้เดินทางให้ครบถ้วน');
      return;
    }
    setIsLoading(true);
    setIsUploadingSignature(false);
    setIsUploadingPassengerPhoto(false);

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

      // Upload passenger photo if exists
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
        } catch (err: unknown) {
          if (err instanceof Error) {
            throw err;
          }
          throw new Error('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพผู้โดยสาร');
        } finally {
          setIsUploadingPassengerPhoto(false);
        }
      }

      // Create booking
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endLocation: destination,
          purpose,
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          passengerCount: passengerCount ? parseInt(passengerCount, 10) : null,
          tripType: tripType || null,
          expresswayOption: expresswayOption || null,
          requestForSelf,
          travelerName: requestForSelf ? null : travelerName?.trim() || null,
          travelerPosition: requestForSelf ? null : travelerPosition?.trim() || null,
          travelerPhone: requestForSelf ? null : travelerPhone?.trim() || null,
          requesterSignatureUrl,
          passengerImageUrl,
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
      setIsUploadingPassengerPhoto(false);
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
            <label className="block mb-2 text-sm font-medium text-gray-700">ขอใช้สำหรับ*</label>
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
              <p className="text-sm font-medium text-gray-700">ข้อมูลผู้เดินทาง*</p>
              <div>
                <label className="block mb-1 text-sm text-gray-600">ชื่อ-นามสกุล*</label>
                <input value={travelerName} onChange={(e) => setTravelerName(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required={!requestForSelf} placeholder="ระบุชื่อ-นามสกุลผู้เดินทาง" />
              </div>
              <div>
                <label className="block mb-1 text-sm text-gray-600">ตำแหน่ง*</label>
                <input value={travelerPosition} onChange={(e) => setTravelerPosition(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required={!requestForSelf} placeholder="ระบุตำแหน่ง" />
              </div>
              <div>
                <label className="block mb-1 text-sm text-gray-600">เบอร์โทร*</label>
                <input type="tel" value={travelerPhone} onChange={(e) => setTravelerPhone(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required={!requestForSelf} placeholder="ระบุเบอร์โทรศัพท์" />
              </div>
            </div>
          )}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">สถานที่ปลายทาง*</label>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">วัตถุประสงค์*</label>
            <textarea rows={4} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">หมายเหตุเพิ่มเติม (ไม่บังคับ)</label>
            <textarea rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" placeholder="ระบุหมายเหตุเพิ่มเติมถ้ามี" />
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
            <label className="block mb-2 text-sm font-medium text-gray-700">วันเวลาออกเดินทาง*</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">วันที่สิ้นสุด*</label>
            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
          </div>
          <div>
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
                <span className="text-sm text-gray-700">ส่งอย่างเดียว</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="tripType"
                  value="PICK_UP"
                  checked={tripType === 'PICK_UP'}
                  onChange={(e) => setTripType(e.target.value as TripType)}
                  className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                  required
                />
                <span className="text-sm text-gray-700">รับอย่างเดียว</span>
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
                <span className="text-sm text-gray-700">ไป-กลับ/รอรับ</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">การเดินทาง*</label>
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
                      ระบบจะบันทึกเข้าข้อมูลส่วนตัวตอนกด "สร้างคำขอ" หากติ๊กตัวเลือกนี้ไว้
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
                บัญชีนี้ยังไม่มีลายเซ็นในข้อมูลส่วนตัว สามารถเลือก "ใช้ลายเซ็นใหม่เฉพาะคำขอนี้" แล้วกดบันทึกเป็นลายเซ็นส่วนตัวได้
              </div>
            )}
          </div>
          {error && <p className="text-red-600 text-center text-sm">{error}</p>}
          {isUploadingSignature && <p className="text-blue-600 text-center text-sm">กำลังอัปโหลดลายเซ็น...</p>}
          {isUploadingPassengerPhoto && <p className="text-blue-600 text-center text-sm">กำลังอัปโหลดรูปภาพผู้โดยสาร...</p>}
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

