'use client';

import { useState, useEffect } from 'react';

// สร้าง Type เพื่อให้ TypeScript รู้จักโครงสร้างข้อมูล
interface Booking {
  id: string;
  endLocation: string | null;
  startTime: string | null;
  requester: {
    name: string | null;
  };
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ฟังก์ชันสำหรับดึงข้อมูลรายการที่รออนุมัติ
  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      setBookings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // เรียกใช้ฟังก์ชัน fetchBookings เมื่อหน้าโหลดครั้งแรก
  useEffect(() => {
    fetchBookings();
  }, []);

  // ฟังก์ชันสำหรับจัดการการกดปุ่ม อนุมัติ/ปฏิเสธ
  const handleUpdateStatus = async (bookingId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // อัปเดตหน้าจอทันทีโดยไม่ต้องโหลดใหม่
      // โดยการกรองรายการที่เพิ่งจัดการออกไป
      setBookings(currentBookings => 
        currentBookings.filter(booking => booking.id !== bookingId)
      );

    } catch (err: any) {
      // แสดง Error หากการอัปเดตล้มเหลว
      alert(`Error: ${err.message}`);
    }
  };
  
  // ส่วนจัดการการแสดงผลระหว่างโหลดหรือเมื่อเกิด Error
  if (isLoading) return <p className="p-8">Loading...</p>;
  if (error) return <p className="p-8 text-red-500">Error: {error}</p>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
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
              {bookings.length > 0 ? (
                bookings.map((booking) => (
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
                        className="bg-green-500 text-white px-3 py-1 rounded-md mr-2 hover:bg-green-600 transition-colors">
                        อนุมัติ
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(booking.id, 'REJECTED')}
                        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors">
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