// src/app/admin/dashboard/page.tsx
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

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Failed to fetch data');
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpdateStatus = async (bookingId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      // โหลดข้อมูล Dashboard ใหม่ทั้งหมดหลังอัปเดตสำเร็จ
      fetchDashboardData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };
  
  if (isLoading) return <p className="p-4 md:p-8">Loading...</p>;
  if (error) return <p className="p-4 md:p-8 text-red-500">Error: {error}</p>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-gray-500">รอการพิจารณา (Pending)</h3>
              <p className="text-3xl font-bold">{data?.counts.pending ?? 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-gray-500">รอการยืนยัน (Approved)</h3>
              <p className="text-3xl font-bold">{data?.counts.approved ?? 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-gray-500">กำลังเดินทาง</h3>
              <p className="text-3xl font-bold">{data?.counts.inProgress ?? 0}</p>
          </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">รายการรออนุมัติเบื้องต้น</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Booking ID</th>
                <th className="text-left py-2 px-4">ผู้ขอใช้</th>
                <th className="text-left py-2 px-4">ปลายทาง</th>
                <th className="text-left py-2 px-4">วันเวลา</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data && data.pendingBookings.length > 0 ? (
                data.pendingBookings.map((booking) => (
                  <tr key={booking.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{booking.id.substring(0, 8)}...</td>
                    <td className="py-2 px-4">{booking.requester.name}</td>
                    <td className="py-2 px-4">{booking.endLocation}</td>
                    <td className="py-2 px-4">
                      {booking.startTime ? new Date(booking.startTime).toLocaleString('th-TH') : '-'}
                    </td>
                    <td className="py-2 px-4">
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'APPROVED')}
                        className="bg-green-500 text-white px-3 py-1 rounded-md mr-2 hover:bg-green-600">
                        อนุมัติ
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'REJECTED')}
                        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600">
                        ปฏิเสธ
                      </button>
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
    </div>
  );
}