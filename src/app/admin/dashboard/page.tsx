'use client';

import { useState, useEffect } from 'react';
import LoadingScreen from '@/components/LoadingScreen';

interface Booking {
  id: string;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  purpose: string | null;
  additionalNotes?: string | null;
  passengerCount: number | null;
  tripType: string | null;
  requestForSelf?: boolean | null;
  travelerName?: string | null;
  travelerPosition?: string | null;
  travelerPhone?: string | null;
  requester: {
    name: string | null;
    position: string | null;
    email: string;
    phoneNumber: string | null;
  };
}

interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  type: string | null;
  capacity: number | null;
  passengerCapacity: number | null;
}

interface Driver {
  id: string;
  name: string | null;
  email: string;
  position: string | null;
  role: string;
}

interface DashboardData {
  counts: {
    pending: number;
    approved: number;
    inProgress: number;
  };
  pendingBookings: Booking[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Failed to fetch data');
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: unknown) { // <-- แก้ไข: ใช้ unknown
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      const vehiclesData = await response.json();
      setVehicles(vehiclesData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      } else {
        alert('An unknown error occurred');
      }
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  const fetchDrivers = async () => {
    setIsLoadingDrivers(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch drivers');
      const usersData = await response.json();
      // กรองเฉพาะผู้ใช้ที่มี role เป็น Driver
      const driversData = usersData.filter((user: Driver) => user.role === 'Driver');
      setDrivers(driversData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      } else {
        alert('An unknown error occurred');
      }
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  const handleApproveClick = async (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setSelectedVehicleId('');
    setSelectedDriverId('');
    await Promise.all([fetchVehicles(), fetchDrivers()]);
    setShowVehicleModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedBookingId) {
      alert('เกิดข้อผิดพลาด');
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${selectedBookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'APPROVED',
          ...(selectedVehicleId ? { vehicleId: selectedVehicleId } : {}),
          ...(selectedDriverId ? { driverId: selectedDriverId } : {}),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      setShowVehicleModal(false);
      setSelectedBookingId(null);
      setSelectedVehicleId('');
      setSelectedDriverId('');
      fetchDashboardData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      } else {
        alert('An unknown error occurred');
      }
    }
  };

  const handleReject = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchDashboardData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      } else {
        alert('An unknown error occurred');
      }
    }
  };

  const handleViewDetails = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) throw new Error('Failed to fetch booking details');
      const bookingData = await response.json();
      setSelectedBooking(bookingData);
      setShowDetailModal(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error: ${err.message}`);
      } else {
        alert('An unknown error occurred');
      }
    }
  };
  
  if (isLoading) return <div className="p-4 md:p-8"><LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูล..." /></div>;
  if (error) return <p className="p-4 md:p-8 text-red-500">Error: {error}</p>;

  // ... ส่วนของ return JSX เหมือนเดิม ...
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-[#004c80]">Dashboard</h1>
        <p className="text-gray-700">ภาพรวมสถานะคำขอ และรายการที่รอการอนุมัติ</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#0076c3]/10" />
              <h3 className="text-sm font-medium text-gray-500">รอการพิจารณา</h3>
              <p className="mt-2 text-4xl font-extrabold text-[#004c80]">{data?.counts.pending ?? 0}</p>
              <p className="mt-1 text-xs text-gray-400">Pending</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10" />
              <h3 className="text-sm font-medium text-gray-500">รอการยืนยัน</h3>
              <p className="mt-2 text-4xl font-extrabold text-[#004c80]">{data?.counts.approved ?? 0}</p>
              <p className="mt-1 text-xs text-gray-400">Approved</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/10" />
              <h3 className="text-sm font-medium text-gray-500">กำลังเดินทาง</h3>
              <p className="mt-2 text-4xl font-extrabold text-[#004c80]">{data?.counts.inProgress ?? 0}</p>
              <p className="mt-1 text-xs text-gray-400">In Progress</p>
          </div>
      </div>
      
      <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#004c80]">รายการรออนุมัติเบื้องต้น</h2>
          <button onClick={fetchDashboardData} className="rounded-xl bg-[#0076c3] px-3 py-1.5 text-white shadow hover:bg-[#0087de]">Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-[#004c80]/5">
                <th className="text-left py-2 px-4 text-[#004c80]">Booking ID</th>
                <th className="text-left py-2 px-4 text-[#004c80]">ผู้ขอใช้</th>
                <th className="text-left py-2 px-4 text-[#004c80]">ตำแหน่ง</th>
                <th className="text-left py-2 px-4 text-[#004c80]">ปลายทาง</th>
                <th className="text-left py-2 px-4 text-[#004c80]">วันเวลาเริ่ม</th>
                <th className="text-left py-2 px-4 text-[#004c80]">วันเวลาสิ้นสุด</th>
                <th className="text-left py-2 px-4 text-[#004c80]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data && data.pendingBookings.length > 0 ? (
                data.pendingBookings.map((booking) => (
                  <tr key={booking.id} className="border-b hover:bg-[#0076c3]/5">
                    <td className="py-2 px-4">{booking.id.substring(0, 8)}...</td>
                    <td className="py-2 px-4">{booking.requestForSelf !== false ? (booking.requester.name || '-') : (booking.travelerName || '-')}</td>
                    <td className="py-2 px-4">{booking.requestForSelf !== false ? (booking.requester.position || '-') : (booking.travelerPosition || '-')}</td>
                    <td className="py-2 px-4">{booking.endLocation}</td>
                    <td className="py-2 px-4">
                      {booking.startTime ? new Date(booking.startTime).toLocaleString('th-TH') : '-'}
                    </td>
                    <td className="py-2 px-4">
                      {booking.endTime ? new Date(booking.endTime).toLocaleString('th-TH') : '-'}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewDetails(booking.id)}
                          className="rounded-md bg-white px-3 py-1 text-[#0076c3] ring-1 ring-[#0076c3]/30 hover:bg-[#0076c3]/5">
                          ดูรายละเอียด
                        </button>
                        <button 
                          onClick={() => handleApproveClick(booking.id)}
                          className="rounded-md bg-white px-3 py-1 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">
                          อนุมัติ
                        </button>
                        <button 
                          onClick={() => handleReject(booking.id)}
                          className="rounded-md bg-white px-3 py-1 text-red-600 ring-1 ring-red-200 hover:bg-red-50">
                          ปฏิเสธ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 px-4 text-center text-gray-500">
                    ไม่มีรายการรออนุมัติ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle & Driver Selection Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[90vh] my-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-semibold text-[#004c80]">เลือกรถยนต์และคนขับ</h2>
            </div>

            <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 space-y-4">
              {isLoadingVehicles || isLoadingDrivers ? (
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เลือกรถยนต์
                    </label>
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                    >
                      <option value="">-- เลือกรถยนต์ (ไม่บังคับ) --</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.licensePlate} - {vehicle.brand} {vehicle.model} {vehicle.type ? `(${vehicle.type})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เลือกคนขับ
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                    >
                      <option value="">-- เลือกคนขับ (ไม่บังคับ) --</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name || driver.email} {driver.position ? `(${driver.position})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setShowVehicleModal(false);
                  setSelectedBookingId(null);
                  setSelectedVehicleId('');
                  setSelectedDriverId('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApproveConfirm}
                className="px-4 py-2 rounded-lg bg-[#0076c3] text-white hover:bg-[#005b99] transition-colors"
              >
                อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[#004c80]">รายละเอียดการจอง</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedBooking(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* ผู้เดินทาง */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-[#004c80] mb-2">ข้อมูลผู้เดินทาง</h3>
                <p><span className="font-medium">ชื่อ:</span> {selectedBooking.requestForSelf !== false ? (selectedBooking.requester.name || '-') : (selectedBooking.travelerName || '-')}</p>
                <p><span className="font-medium">ตำแหน่ง:</span> {selectedBooking.requestForSelf !== false ? (selectedBooking.requester.position || '-') : (selectedBooking.travelerPosition || '-')}</p>
                <p><span className="font-medium">เบอร์โทร:</span> {selectedBooking.requestForSelf !== false ? (selectedBooking.requester.phoneNumber || '-') : (selectedBooking.travelerPhone || '-')}</p>
                {selectedBooking.requestForSelf === false && (
                  <p className="mt-2 text-sm text-gray-500"><span className="font-medium">ผู้สร้างคำขอ:</span> {selectedBooking.requester.name} ({selectedBooking.requester.email})</p>
                )}
              </div>

              {/* Trip Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-[#004c80] mb-2">รายละเอียดการเดินทาง</h3>
                <p><span className="font-medium">ปลายทาง:</span> {selectedBooking.endLocation || '-'}</p>
                <p><span className="font-medium">วัตถุประสงค์:</span> {selectedBooking.purpose || '-'}</p>
                {selectedBooking.tripType && (
                  <p><span className="font-medium">ประเภทการเดินทาง:</span> {
                    selectedBooking.tripType === 'ONE_WAY' ? 'ส่งอย่างเดียว' :
                    selectedBooking.tripType === 'PICK_UP' ? 'รับอย่างเดียว' :
                    selectedBooking.tripType === 'ROUND_TRIP' ? 'ไป-กลับ/รอรับ' :
                    selectedBooking.tripType
                  }</p>
                )}
                {selectedBooking.passengerCount && (
                  <p><span className="font-medium">จำนวนคนนั่ง:</span> {selectedBooking.passengerCount} คน</p>
                )}
              </div>

              {/* หมายเหตุเพิ่มเติม - แยกกล่องให้โดดเด่น */}
              {selectedBooking.additionalNotes && (
                <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <span className="text-amber-600" aria-hidden>📌</span>
                    หมายเหตุเพิ่มเติม
                  </h3>
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedBooking.additionalNotes}</p>
                </div>
              )}

              {/* Schedule */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-[#004c80] mb-2">กำหนดการ</h3>
                <p><span className="font-medium">วันเวลาเริ่ม:</span> {
                  selectedBooking.startTime 
                    ? new Date(selectedBooking.startTime).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-'
                }</p>
                <p><span className="font-medium">วันเวลาสิ้นสุด:</span> {
                  selectedBooking.endTime 
                    ? new Date(selectedBooking.endTime).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-'
                }</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedBooking(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleApproveClick(selectedBooking.id);
                }}
                className="px-4 py-2 rounded-lg bg-[#0076c3] text-white hover:bg-[#005b99] transition-colors"
              >
                อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}