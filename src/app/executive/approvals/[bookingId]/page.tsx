'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Booking {
  id: string;
  purpose: string | null;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  createdAt: string;
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

interface SignatureUploadProps {
  onSignatureUpload: (file: File) => void;
  isLoading: boolean;
}

function SignatureUpload({ onSignatureUpload, isLoading }: SignatureUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFile(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Pass file to parent
    onSignatureUpload(file);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#004c80]">อัปโหลดลายเซ็น</h3>
      
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-[#0076c3] bg-[#0076c3]/5' 
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
          disabled={isLoading}
        />
        
        {preview ? (
          <div className="space-y-4">
            <Image 
              src={preview} 
              alt="Signature Preview" 
              width={200}
              height={128}
              className="mx-auto max-h-32 border rounded-lg"
            />
            <p className="text-sm text-green-600">✓ ลายเซ็นพร้อมใช้งาน</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-[#0076c3]/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-[#0076c3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">ลากไฟลายเซ็นมาวางที่นี่</p>
              <p className="text-sm text-gray-500">หรือคลิกเพื่อเลือกไฟล์</p>
            </div>
            <p className="text-xs text-gray-400">รองรับไฟล์: JPG, PNG, GIF (ขนาดไม่เกิน 5MB)</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingConfirmationPage({ params }: { params: { bookingId: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const fetchBooking = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${params.bookingId}`);
      if (!response.ok) {
        throw new Error('ไม่พบข้อมูลการเดินทาง');
      }
      const data = await response.json();
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      setError('ไม่สามารถโหลดข้อมูลการเดินทางได้');
    } finally {
      setIsLoading(false);
    }
  }, [params.bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleSignatureUpload = (file: File) => {
    setSignatureFile(file);
  };

  const handleConfirm = async () => {
    if (!signatureFile) {
      setError('กรุณาอัปโหลดลายเซ็นก่อนยืนยัน');
      return;
    }

    setIsConfirming(true);
    setError('');

    try {
      // First upload signature
      const signatureFormData = new FormData();
      signatureFormData.append('signature', signatureFile);

      const signatureResponse = await fetch('/api/upload/signature', {
        method: 'POST',
        body: signatureFormData,
      });

      if (!signatureResponse.ok) {
        throw new Error('ไม่สามารถอัปโหลดลายเซ็นได้');
      }

      const signatureData = await signatureResponse.json();

      // Then confirm booking
      const confirmResponse = await fetch(`/api/bookings/${params.bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CONFIRMED',
          executiveConfirmerId: session?.user?.id,
          signatureImageUrl: signatureData.url,
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error('ไม่สามารถยืนยันการเดินทางได้');
      }

      // Generate PDF after confirmation
      try {
        const pdfResponse = await fetch(`/api/bookings/${params.bookingId}/pdf`, {
          method: 'POST',
        });

        if (!pdfResponse.ok) {
          console.error('PDF generation failed, but booking was confirmed');
        }
      } catch (error) {
        console.error('Error generating PDF:', error);
        // Continue even if PDF generation fails
      }

      // Redirect to dashboard
      router.push('/executive?confirmed=true');
    } catch (error) {
      console.error('Error confirming booking:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการยืนยัน');
    } finally {
      setIsConfirming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            onClick={() => router.push('/executive')}
            className="px-4 py-2 bg-[#0076c3] text-white rounded-lg hover:bg-[#005b99] transition-colors"
          >
            กลับไปหน้า Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!booking || booking.status !== 'APPROVED') {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-100 text-yellow-600 grid place-items-center">
            ⚠️
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">ไม่สามารถยืนยันได้</h3>
          <p className="text-gray-500 mb-4">
            การเดินทางนี้ไม่ได้อยู่ในสถานะที่รอยืนยัน หรือไม่พบข้อมูล
          </p>
          <button
            onClick={() => router.push('/executive')}
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
        <h1 className="text-3xl font-bold text-[#004c80] mb-2">ยืนยันการเดินทาง</h1>
        <p className="text-gray-600">ตรวจสอบรายละเอียดและยืนยันการเดินทางขั้นสุดท้าย</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Booking Details */}
        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <h2 className="text-xl font-semibold text-[#004c80] mb-6">รายละเอียดการเดินทาง</h2>
          
          <div className="space-y-6">
            {/* Requester Info */}
            <div>
              <h3 className="font-semibold text-[#004c80] mb-3">ผู้ขอใช้</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{booking.requester.name}</p>
                <p className="text-sm text-gray-600">{booking.requester.position}</p>
                <p className="text-sm text-gray-500">{booking.requester.email}</p>
              </div>
            </div>

            {/* Trip Details */}
            <div>
              <h3 className="font-semibold text-[#004c80] mb-3">รายละเอียดการเดินทาง</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><span className="font-medium">ไป:</span> {booking.endLocation}</p>
                <p><span className="font-medium">วัตถุประสงค์:</span> {booking.purpose}</p>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h3 className="font-semibold text-[#004c80] mb-3">กำหนดการ</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><span className="font-medium">วันที่เริ่ม:</span> {booking.startTime ? formatDate(booking.startTime) : '-'}</p>
                <p><span className="font-medium">วันที่สิ้นสุด:</span> {booking.endTime ? formatDate(booking.endTime) : '-'}</p>
              </div>
            </div>

            {/* Vehicle & Driver */}
            <div>
              <h3 className="font-semibold text-[#004c80] mb-3">ยานพาหนะ & คนขับ</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {booking.vehicle ? (
                  <p><span className="font-medium">รถ:</span> {booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.licensePlate})</p>
                ) : (
                  <p className="text-gray-500">ยังไม่ได้กำหนดรถ</p>
                )}
                {booking.driver ? (
                  <p><span className="font-medium">คนขับ:</span> {booking.driver.name}</p>
                ) : (
                  <p className="text-gray-500">ยังไม่ได้กำหนดคนขับ</p>
                )}
              </div>
            </div>

            {/* Admin Approver */}
            {booking.adminApprover && (
              <div>
                <h3 className="font-semibold text-[#004c80] mb-3">การอนุมัติเบื้องต้น</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-700">
                    <span className="font-medium">อนุมัติโดย:</span> {booking.adminApprover.name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Form */}
        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <h2 className="text-xl font-semibold text-[#004c80] mb-6">ยืนยันการเดินทาง</h2>
          
          <div className="space-y-6">
            {/* Signature Upload */}
            <SignatureUpload 
              onSignatureUpload={handleSignatureUpload}
              isLoading={isConfirming}
            />

            {/* Confirmation Notice */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h4 className="font-medium text-blue-900">ข้อควรทราบ</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    การยืนยันนี้จะเป็นการอนุมัติขั้นสุดท้าย หลังจากยืนยันแล้ว ระบบจะสร้างเอกสาร PDF 
                    และส่งการแจ้งเตือนไปยังผู้เกี่ยวข้อง
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isConfirming}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirm}
                disabled={!signatureFile || isConfirming}
                className="flex-1 px-4 py-3 rounded-xl bg-[#0076c3] text-white hover:bg-[#005b99] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isConfirming ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังยืนยัน...
                  </div>
                ) : (
                  'ยืนยันการเดินทาง'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
