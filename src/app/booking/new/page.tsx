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
      router.push('/'); // กลับไปที่หน้าหลัก (ซึ่งจะ redirect ไปหน้า My Bookings)
    } catch (err: unknown) { // <-- แก้ไข: ใช้ unknown แทน any
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]"></div>
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#0076c3]/20 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#004c80]/20 blur-3xl"></div>

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <div className="rounded-2xl bg-white/80 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur">
          <h1 className="text-2xl font-bold mb-6 text-[#004c80] text-center">แบบฟอร์มขอใช้รถยนต์</h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2" htmlFor="destination">สถานที่ปลายทาง*</label>
              <input
                id="destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2" htmlFor="startTime">วันที่และเวลาออกเดินทาง*</label>
                <input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2" htmlFor="purpose">วัตถุประสงค์*</label>
              <textarea
                id="purpose"
                rows={4}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
              ></textarea>
            </div>

            {error && <p className="text-red-600 text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#004c80] to-[#0076c3] px-5 py-3 font-medium text-white shadow-lg transition hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60"
            >
              <span className="relative z-10">{isLoading ? 'กำลังส่งข้อมูล...' : 'ยืนยันการจอง'}</span>
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition group-hover:translate-x-0"></span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
