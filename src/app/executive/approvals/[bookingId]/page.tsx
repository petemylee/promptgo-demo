'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import SignaturePad from '@/components/SignaturePad';
import BookingSummaryHeader from '@/components/booking/BookingSummaryHeader';
import NextStepCallout from '@/components/booking/NextStepCallout';
import { routeTextWrapClass } from '@/components/booking/routeTextWrap';
import { formatDateTimeTHLong } from '@/lib/formatters';

interface Booking {
  id: string;
  purpose: string | null;
  additionalNotes: string | null;
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
    phoneNumber: string | null;
    profileImageUrl: string | null;
  };
  adminApprover: {
    name: string | null;
    phoneNumber: string | null;
  } | null;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: string | null;
    model: string | null;
    vehicleImageUrl: string | null;
  } | null;
  driver: {
    id: string;
    name: string | null;
    phoneNumber: string | null;
    profileImageUrl: string | null;
  } | null;
}

interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  type: string | null;
  capacity: number | null;
  passengerCapacity: number | null;
  vehicleImageUrl: string | null;
}

interface Driver {
  id: string;
  name: string | null;
  email: string;
  position: string | null;
  phoneNumber: string | null;
  profileImageUrl: string | null;
}


export default function BookingConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  type SignatureMode = 'PROFILE' | 'NEW';
  const { bookingId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('NEW');
  const [saveAsMySignature, setSaveAsMySignature] = useState(true);
  const [mySignatureUrl, setMySignatureUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('ไม่พบข้อมูลการเดินทาง');
      }
      const data = await response.json();
      setBooking(data);
      // Set initial vehicle selection
      if (data.vehicle) {
        setSelectedVehicleId(data.vehicle.id);
      }
      // Set initial driver selection if driver exists
      if (data.driver && data.driver.id) {
        setSelectedDriverId(data.driver.id);
      }
      // Set PDF URL if exists
      if (data.generatedFormUrl) {
        setPdfUrl(data.generatedFormUrl);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      setError('ไม่สามารถโหลดข้อมูลการเดินทางได้');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  const fetchVehicles = useCallback(async () => {
    setIsLoadingVehicles(true);
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const vehiclesData = await response.json();
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    setIsLoadingDrivers(true);
    try {
      const response = await fetch('/api/drivers');
      if (!response.ok) {
        throw new Error('Failed to fetch drivers');
      }
      const driversData = await response.json();
      setDrivers(driversData);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setIsLoadingDrivers(false);
    }
  }, []);

  useEffect(() => {
    fetchBooking();
    fetchVehicles();
    fetchDrivers();
  }, [fetchBooking, fetchVehicles, fetchDrivers]);

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (!response.ok) return;
        const me = await response.json();
        const existingSignature = me.signatureImageUrl || null;
        setMySignatureUrl(existingSignature);
        setSignatureMode(existingSignature ? 'PROFILE' : 'NEW');
      } catch {
        setMySignatureUrl(null);
        setSignatureMode('NEW');
      }
    };
    fetchMyProfile();
  }, []);

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
  };

  const handleConfirm = async () => {
    if (!selectedVehicleId) {
      setError('กรุณาเลือกรถยนต์');
      return;
    }

    if (!selectedDriverId) {
      setError('กรุณาเลือกคนขับ');
      return;
    }
    if (signatureMode === 'NEW' && !signatureDataUrl) {
      setError('กรุณาเซ็นลายเซ็นก่อนยืนยัน');
      return;
    }

    setIsConfirming(true);
    setError('');

    try {
      // Prepare signature according to selected mode
      let signatureImageUrl: string | null = null;
      
      if (signatureMode === 'PROFILE') {
        if (!mySignatureUrl) {
          throw new Error('ไม่พบลายเซ็นของฉันในข้อมูลส่วนตัว');
        }
        signatureImageUrl = mySignatureUrl || null;
      } else if (signatureMode === 'NEW' && signatureDataUrl) {
        try {
          // Convert data URL to blob
          const response = await fetch(signatureDataUrl);
          const blob = await response.blob();
          
          const signatureFormData = new FormData();
          signatureFormData.append('signature', blob, 'signature.png');

          const signatureResponse = await fetch('/api/upload/signature', {
            method: 'POST',
            body: signatureFormData,
          });

          if (signatureResponse.ok) {
            const signatureData = await signatureResponse.json();
            signatureImageUrl = signatureData.url;
            if (saveAsMySignature) {
              setMySignatureUrl(signatureData.url);
            }
          } else {
            console.warn('Signature upload failed, continuing without signature');
          }
        } catch (error) {
          console.warn('Signature upload error, continuing without signature:', error);
        }
      }

      // Then confirm booking
      const confirmResponse = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CONFIRMED',
          executiveConfirmerId: session?.user?.id,
          signatureImageUrl: signatureImageUrl,
          saveExecutiveSignatureToProfile: signatureMode === 'NEW' ? saveAsMySignature : true,
          vehicleId: selectedVehicleId,
          driverId: selectedDriverId,
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error('ไม่สามารถยืนยันการเดินทางได้');
      }

      // Refresh booking data
      await fetchBooking();

      // Redirect to dashboard
      router.push('/executive?confirmed=true');
    } catch (error) {
      console.error('Error confirming booking:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการยืนยัน');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!booking || booking.status !== 'CONFIRMED') {
      setError('สามารถสร้าง PDF ได้เฉพาะการเดินทางที่ยืนยันแล้ว');
      return;
    }

    setIsGeneratingPDF(true);
    setError('');

    try {
      const pdfResponse = await fetch(`/api/bookings/${bookingId}/pdf`, {
        method: 'POST',
      });

      if (!pdfResponse.ok) {
        const errorData = await pdfResponse.json();
        throw new Error(errorData.error || 'ไม่สามารถสร้าง PDF ได้');
      }

      const pdfData = await pdfResponse.json();
      setPdfUrl(pdfData.url);
      
      // Refresh booking data to get updated PDF URL
      await fetchBooking();
      
      alert('สร้าง PDF สำเร็จ!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      setIsGeneratingPDF(false);
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

      <div className="mb-6 space-y-3">
        <BookingSummaryHeader
          status={booking.status}
          startLocation={null}
          endLocation={booking.endLocation}
          startTime={booking.startTime}
          endTime={booking.endTime}
          vehicle={booking.vehicle ? { licensePlate: booking.vehicle.licensePlate } : null}
          driver={booking.driver ? { name: booking.driver.name } : null}
        />
        <NextStepCallout
          role="Executive"
          status={booking.status}
          hasVehicle={!!selectedVehicleId}
          hasDriver={!!selectedDriverId}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Booking Details */}
        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <h2 className="text-xl font-semibold text-[#004c80] mb-6">รายละเอียดการเดินทาง</h2>
          
          <div className="space-y-6">
            <details className="rounded-2xl border border-slate-200/70 bg-white shadow-sm ring-1 ring-black/5" open>
              <summary className="cursor-pointer list-none select-none px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#004c80]">ผู้เดินทาง</h3>
                  <span className="text-slate-500" aria-hidden>▾</span>
                </div>
              </summary>
              <div className="px-4 pb-4">
            {/* ผู้เดินทาง */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {booking.requestForSelf !== false && booking.requester.profileImageUrl && (
                  <div className="mb-2">
                    <Image
                      src={booking.requester.profileImageUrl}
                      alt="Requester Photo"
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
                <p className="font-medium">{booking.requestForSelf !== false ? (booking.requester.name || '-') : (booking.travelerName || '-')}</p>
                <p className="text-sm text-gray-600">{booking.requestForSelf !== false ? (booking.requester.position || '-') : (booking.travelerPosition || '-')}</p>
                <p className="text-sm text-gray-500">โทร: {booking.requestForSelf !== false ? (booking.requester.phoneNumber || '-') : (booking.travelerPhone || '-')}</p>
                {booking.requestForSelf === false && (
                  <p className="text-sm text-gray-500 mt-2">ผู้สร้างคำขอ: {booking.requester.name} ({booking.requester.email})</p>
                )}
              </div>
              </div>
            </details>

            {/* Trip Details */}
            <details className="rounded-2xl border border-slate-200/70 bg-white shadow-sm ring-1 ring-black/5" open>
              <summary className="cursor-pointer list-none select-none px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#004c80]">รายละเอียดการเดินทาง</h3>
                  <span className="text-slate-500" aria-hidden>▾</span>
                </div>
              </summary>
              <div className="px-4 pb-4">
              <div className={`bg-gray-50 p-4 rounded-lg space-y-2 ${routeTextWrapClass}`}>
                <p><span className="font-medium">ไป:</span> {booking.endLocation}</p>
                <p><span className="font-medium">วัตถุประสงค์:</span> {booking.purpose}</p>
              </div>
              </div>
            </details>

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

            {/* Schedule */}
            <details className="rounded-2xl border border-slate-200/70 bg-white shadow-sm ring-1 ring-black/5">
              <summary className="cursor-pointer list-none select-none px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#004c80]">กำหนดการ</h3>
                  <span className="text-slate-500" aria-hidden>▾</span>
                </div>
              </summary>
              <div className="px-4 pb-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><span className="font-medium">วันที่เริ่ม:</span> {booking.startTime ? formatDate(booking.startTime) : '-'}</p>
                <p><span className="font-medium">วันที่สิ้นสุด:</span> {booking.endTime ? formatDate(booking.endTime) : '-'}</p>
              </div>
              </div>
            </details>

            {/* Vehicle & Driver */}
            <details className="rounded-2xl border border-slate-200/70 bg-white shadow-sm ring-1 ring-black/5" open>
              <summary className="cursor-pointer list-none select-none px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#004c80]">ยานพาหนะ & คนขับ (ต้องเลือก)</h3>
                  <span className="text-slate-500" aria-hidden>▾</span>
                </div>
              </summary>
              <div className="px-4 pb-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รถยนต์ <span className="text-red-500">*</span>
                  </label>
                  {isLoadingVehicles ? (
                    <p className="text-gray-500 text-sm">กำลังโหลดข้อมูลรถยนต์...</p>
                  ) : (
                    <>
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                        required
                      >
                        <option value="">-- เลือกรถยนต์ (บังคับ) --</option>
                        {vehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.licensePlate} - {vehicle.brand} {vehicle.model} {vehicle.type ? `(${vehicle.type})` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedVehicleId && vehicles.find(v => v.id === selectedVehicleId)?.vehicleImageUrl && (
                        <div className="mt-2">
                          <Image
                            src={vehicles.find(v => v.id === selectedVehicleId)!.vehicleImageUrl!}
                            alt="Vehicle Photo"
                            width={200}
                            height={150}
                            sizes="(max-width: 640px) 100vw, 200px"
                            loading="eager"
                            className="rounded-lg object-cover mt-2"
                            style={{ width: 'auto', height: 'auto' }}
                            priority
                          />
                        </div>
                      )}
                      {booking.vehicle && !selectedVehicleId && (
                        <>
                          <p className="text-xs text-gray-500 mt-1">
                            รถยนต์ที่ Admin เลือก: {booking.vehicle.licensePlate} - {booking.vehicle.brand} {booking.vehicle.model}
                          </p>
                          {booking.vehicle.vehicleImageUrl && (
                            <div className="mt-2">
                              <Image
                                src={booking.vehicle.vehicleImageUrl}
                                alt="Vehicle Photo"
                                width={200}
                                height={150}
                                sizes="(max-width: 640px) 100vw, 200px"
                                loading="eager"
                                className="rounded-lg object-cover"
                                style={{ width: 'auto', height: 'auto' }}
                                priority
                              />
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    คนขับ <span className="text-red-500">*</span>
                  </label>
                  {isLoadingDrivers ? (
                    <p className="text-gray-500 text-sm">กำลังโหลดข้อมูลคนขับ...</p>
                  ) : (
                    <>
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                        required
                      >
                        <option value="">-- เลือกคนขับ (บังคับ) --</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name || driver.email} {driver.position ? `(${driver.position})` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedDriverId && drivers.find(d => d.id === selectedDriverId)?.profileImageUrl && (
                        <div className="mt-2">
                          <Image
                            src={drivers.find(d => d.id === selectedDriverId)!.profileImageUrl!}
                            alt="Driver Photo"
                            width={100}
                            height={100}
                            className="rounded-lg object-cover mt-2"
                          />
                        </div>
                      )}
                      {booking.driver && !selectedDriverId && (
                        <>
                          <p className="text-xs text-gray-500 mt-1">
                            คนขับที่ Admin เลือก: {booking.driver.name || '-'}
                          </p>
                          {booking.driver.profileImageUrl && (
                            <div className="mt-2">
                              <Image
                                src={booking.driver.profileImageUrl}
                                alt="Driver Photo"
                                width={100}
                                height={100}
                                className="rounded-lg object-cover"
                              />
                            </div>
                          )}
                          {booking.driver.phoneNumber && (
                            <p className="text-xs text-gray-500 mt-1">โทร: {booking.driver.phoneNumber}</p>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              </div>
            </details>

            {/* Admin Approver */}
            {booking.adminApprover && (
              <div>
                <h3 className="font-semibold text-[#004c80] mb-3">การอนุมัติเบื้องต้น</h3>
                <div className="bg-green-50 p-4 rounded-lg space-y-1">
                  <p className="text-green-700">
                    <span className="font-medium">อนุมัติโดย:</span> {booking.adminApprover.name}
                  </p>
                  {booking.adminApprover.phoneNumber && (
                    <p className="text-sm text-green-600">โทร: {booking.adminApprover.phoneNumber}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Form */}
        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <h2 className="text-xl font-semibold text-[#004c80] mb-6">ยืนยันการเดินทาง</h2>
          
          <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">ตรวจสอบก่อนยืนยัน</div>
                  <ul className="mt-2 text-sm text-slate-700 space-y-1">
                    <li className={selectedVehicleId ? 'text-emerald-700' : 'text-slate-700'}>
                      {selectedVehicleId ? '✓' : '•'} เลือกรถยนต์
                    </li>
                    <li className={selectedDriverId ? 'text-emerald-700' : 'text-slate-700'}>
                      {selectedDriverId ? '✓' : '•'} เลือกคนขับ
                    </li>
                    <li className={(signatureMode === 'PROFILE' && !!mySignatureUrl) || (signatureMode === 'NEW' && !!signatureDataUrl) ? 'text-emerald-700' : 'text-slate-700'}>
                      {((signatureMode === 'PROFILE' && !!mySignatureUrl) || (signatureMode === 'NEW' && !!signatureDataUrl)) ? '✓' : '•'} ลายเซ็นผู้ยืนยัน
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            {/* Signature Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#004c80]">ลายเซ็นผู้ยืนยัน</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="signatureMode"
                    checked={signatureMode === 'PROFILE'}
                    onChange={() => setSignatureMode('PROFILE')}
                    className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                    disabled={!mySignatureUrl}
                  />
                  <span className={`text-sm ${mySignatureUrl ? 'text-gray-700' : 'text-gray-400'}`}>
                    ใช้ลายเซ็นของฉันจากข้อมูลส่วนตัว {mySignatureUrl ? '' : '(ยังไม่มี)'}
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
                  <span className="text-sm text-gray-700">ใช้ลายเซ็นใหม่ครั้งนี้</span>
                </label>
              </div>

              {signatureMode === 'PROFILE' && mySignatureUrl && (
                <div className="space-y-2">
                  <div className="relative inline-block border-2 border-green-300 rounded-lg p-2 bg-green-50/50">
                    <Image
                      src={mySignatureUrl}
                      alt="My Signature"
                      width={300}
                      height={150}
                      className="max-h-32 border rounded-lg object-contain"
                    />
                  </div>
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
                      <p className="text-xs text-gray-700">
                        ระบบต้องใช้ลายเซ็นในการยืนยันขั้นสุดท้าย
                      </p>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAsMySignature}
                          onChange={(e) => setSaveAsMySignature(e.target.checked)}
                          className="w-4 h-4 text-[#0076c3] focus:ring-[#0076c3]"
                          disabled={isConfirming}
                        />
                        <span className="text-xs text-gray-700">บันทึกเป็นลายเซ็นของฉันในข้อมูลส่วนตัวด้วย</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setSignatureDataUrl(null)}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                        disabled={isConfirming}
                      >
                        ลบและวาดใหม่
                      </button>
                    </div>
                  ) : (
                    <SignaturePad
                      onSignatureSave={handleSignatureSave}
                      onClear={() => setSignatureDataUrl(null)}
                      disabled={isConfirming}
                      width={400}
                      height={200}
                    />
                  )}
                </>
              )}
            </div>

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
            {booking.status === 'APPROVED' ? (
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
                disabled={!selectedVehicleId || !selectedDriverId || isConfirming}
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
            ) : booking.status === 'CONFIRMED' ? (
              <div className="space-y-4">
                {/* PDF Generation Section */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900">ยืนยันการเดินทางแล้ว</h4>
                      <p className="text-sm text-green-700 mt-1">
                        คุณสามารถสร้างเอกสาร PDF ได้ทันที
                      </p>
                    </div>
                  </div>
                </div>

                {pdfUrl ? (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 mb-2">เอกสาร PDF ถูกสร้างแล้ว</p>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      เปิด PDF
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF}
                    className="w-full px-4 py-3 rounded-xl bg-[#0076c3] text-white hover:bg-[#005b99] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isGeneratingPDF ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        กำลังสร้าง PDF...
                      </div>
                    ) : (
                      'สร้างเอกสาร PDF'
                    )}
                  </button>
                )}

                <button
                  onClick={() => router.back()}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  กลับ
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
