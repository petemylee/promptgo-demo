// src/app/booking/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBookingPage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (!destination || !purpose || !startTime) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endLocation: destination,
          purpose,
          startTime: new Date(startTime),
        }),
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถสร้างคำขอได้ กรุณาลองใหม่อีกครั้ง');
      }

      // ถ้าสำเร็จ
      alert('สร้างคำขอสำเร็จแล้ว');
      router.push('/'); // กลับไปที่หน้าหลัก (Dashboard ของผู้ใช้)
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">แบบฟอร์มขอใช้รถยนต์</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="destination">สถานที่ปลายทาง*</label>
            <input
              id="destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="startTime">วันที่และเวลาออกเดินทาง*</label>
            <input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="purpose">วัตถุประสงค์*</label>
            <textarea
              id="purpose"
              rows={4}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            ></textarea>
          </div>

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {isLoading ? 'กำลังส่งข้อมูล...' : 'ยืนยันการจอง'}
          </button>
        </form>
      </div>
    </div>
  );
}