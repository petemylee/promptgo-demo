'use client';

import { useState, useEffect } from 'react';

interface Booking {
  id: string;
  endLocation: string | null;
  startTime: string | null;
  requester: {
    name: string | null;
  };
}

interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  type: string | null;
  capacity: number | null;
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

  const handleApproveClick = async (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setSelectedVehicleId('');
    await fetchVehicles();
    setShowVehicleModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedBookingId || !selectedVehicleId) {
      alert('กรุณาเลือกรถยนต์');
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${selectedBookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'APPROVED',
          vehicleId: selectedVehicleId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      setShowVehicleModal(false);
      setSelectedBookingId(null);
      setSelectedVehicleId('');
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
  
  if (isLoading) return <p className="p-4 md:p-8">Loading...</p>;
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
                <th className="text-left py-2 px-4 text-[#004c80]">ปลายทาง</th>
                <th className="text-left py-2 px-4 text-[#004c80]">วันเวลา</th>
                <th className="text-left py-2 px-4 text-[#004c80]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data && data.pendingBookings.length > 0 ? (
                data.pendingBookings.map((booking) => (
                  <tr key={booking.id} className="border-b hover:bg-[#0076c3]/5">
                    <td className="py-2 px-4">{booking.id.substring(0, 8)}...</td>
                    <td className="py-2 px-4">{booking.requester.name}</td>
                    <td className="py-2 px-4">{booking.endLocation}</td>
                    <td className="py-2 px-4">
                      {booking.startTime ? new Date(booking.startTime).toLocaleString('th-TH') : '-'}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
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
                  <td colSpan={5} className="py-4 px-4 text-center text-gray-500">
                    ไม่มีรายการรออนุมัติ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Selection Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-[#004c80] mb-4">เลือกรถยนต์</h2>
            
            {isLoadingVehicles ? (
              <p className="text-gray-500">กำลังโหลดข้อมูลรถยนต์...</p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เลือกรถยนต์ *
                  </label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                  >
                    <option value="">-- เลือกรถยนต์ --</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.licensePlate} - {vehicle.brand} {vehicle.model} {vehicle.type ? `(${vehicle.type})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowVehicleModal(false);
                      setSelectedBookingId(null);
                      setSelectedVehicleId('');
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleApproveConfirm}
                    disabled={!selectedVehicleId}
                    className="px-4 py-2 rounded-lg bg-[#0076c3] text-white hover:bg-[#005b99] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    อนุมัติ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}