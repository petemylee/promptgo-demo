'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function BookingFormModal({ isOpen, onClose, onCreated }: BookingFormModalProps) {
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [passengerCount, setPassengerCount] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDestination('');
      setPurpose('');
      setStartTime('');
      setEndTime('');
      setPassengerCount('');
      setError('');
      setIsLoading(false);
      setSignatureFile(null);
      setSignaturePreview(null);
      setIsUploadingSignature(false);
    }
  }, [isOpen]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      // Handle drag enter/over
    } else if (e.type === 'dragleave') {
      // Handle drag leave
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFile(file);
      } else {
        setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setSignaturePreview(e.target?.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
    setSignatureFile(file);
  };

  const removeSignature = () => {
    setSignatureFile(null);
    setSignaturePreview(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setIsUploadingSignature(false);

    try {
      // Upload signature first if exists
      let requesterSignatureUrl: string | null = null;
      
      if (signatureFile) {
        setIsUploadingSignature(true);
        try {
          const signatureFormData = new FormData();
          signatureFormData.append('signature', signatureFile);

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
        } catch (err: unknown) {
          if (err instanceof Error) {
            throw err;
          }
          throw new Error('เกิดข้อผิดพลาดในการอัปโหลดลายเซ็น');
        } finally {
          setIsUploadingSignature(false);
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
          requesterSignatureUrl,
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-md max-h-[90vh] my-auto rounded-2xl bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur flex flex-col">
        <div className="px-8 pt-8 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-[#004c80]">สร้างคำขอใช้งาน</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-8 py-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">สถานที่ปลายทาง*</label>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
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
            <label className="block mb-2 text-sm font-medium text-gray-700">วัตถุประสงค์*</label>
            <textarea rows={4} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
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
            <label className="block mb-2 text-sm font-medium text-gray-700">ลายเซ็นผู้ขอใช้รถ</label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                signaturePreview
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-gray-300 hover:border-[#0076c3] hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isLoading || isUploadingSignature}
              />
              
              {signaturePreview ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <Image 
                      src={signaturePreview} 
                      alt="Signature Preview" 
                      width={200}
                      height={100}
                      className="mx-auto max-h-24 border rounded-lg object-contain"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-green-600 font-medium">✓ ลายเซ็นพร้อมใช้งาน</p>
                    <button
                      type="button"
                      onClick={removeSignature}
                      className="text-xs text-red-600 hover:text-red-700 underline"
                      disabled={isLoading || isUploadingSignature}
                    >
                      ลบลายเซ็น
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto w-10 h-10 bg-[#0076c3]/10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0076c3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">ลากไฟลายเซ็นมาวางที่นี่</p>
                    <p className="text-xs text-gray-500 mt-1">หรือคลิกเพื่อเลือกไฟล์</p>
                  </div>
                  <p className="text-xs text-gray-400">รองรับไฟล์: JPG, PNG, GIF (ขนาดไม่เกิน 5MB)</p>
                  <p className="text-xs text-gray-400 italic">สามารถเพิ่มได้ภายหลัง</p>
                </div>
              )}
            </div>
          </div>
            {error && <p className="text-red-600 text-center text-sm">{error}</p>}
            {isUploadingSignature && <p className="text-blue-600 text-center text-sm">กำลังอัปโหลดลายเซ็น...</p>}
          </div>
          <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 ring-1 ring-black/10 bg-white hover:bg-gray-50">ยกเลิก</button>
            <button type="submit" disabled={isLoading} className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60">{isLoading ? 'กำลังบันทึก...' : 'สร้างคำขอ'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

