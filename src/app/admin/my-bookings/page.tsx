'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import BookingFormModal from '@/components/BookingFormModal';

type Booking = {
  id: string;
  purpose: string | null;
  startLocation: string | null;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  status: 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MERGED';
  createdAt: string;
  driver: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: string | null;
    model: string | null;
    type: string | null;
  } | null;
};

const StatusBadge = ({ status }: { status: Booking['status'] }) => {
  const map: Record<Booking['status'], { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
    CONFIRMED: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'Confirmed' },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
    IN_PROGRESS: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'In Progress' },
    COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
    MERGED: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Merged' },
  };
  const p = map[status];
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${p.bg} ${p.text} ring-1 ring-black/5`}>{p.label}</span>;
};

export default function AdminMyBookings() {
  const { status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const res = await fetch('/api/my/bookings');
      if (res.ok) {
        setBookings(await res.json());
      }
      setIsLoading(false);
    };
    if (status === 'authenticated') load();
  }, [status]);

  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('openBookingModal', handleOpenModal);
    
    return () => {
      window.removeEventListener('openBookingModal', handleOpenModal);
    };
  }, []);

  const { activeBookings, completedBookings } = useMemo(() => {
    const active = bookings.filter(b => b.status !== 'COMPLETED');
    const completed = bookings.filter(b => b.status === 'COMPLETED');
    return { activeBookings: active, completedBookings: completed };
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeBookings;
    return activeBookings.filter(b =>
      (b.purpose || '').toLowerCase().includes(q) ||
      (b.endLocation || '').toLowerCase().includes(q) ||
      (b.status || '').toLowerCase().includes(q)
    );
  }, [activeBookings, query]);

  const filteredCompleted = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return completedBookings;
    return completedBookings.filter(b =>
      (b.purpose || '').toLowerCase().includes(q) ||
      (b.endLocation || '').toLowerCase().includes(q) ||
      (b.status || '').toLowerCase().includes(q)
    );
  }, [completedBookings, query]);

  if (status === 'loading') return <div className="p-6">Loading...</div>;

  return (
    <div className="relative min-h-screen overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">My Bookings</h1>
          <p className="text-gray-700">ติดตามสถานะคำขอใช้งานยานพาหนะของคุณ</p>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-80">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา: วัตถุประสงค์ ปลายทาง หรือสถานะ"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">+ สร้างคำขอใหม่</button>
        </div>

        {/* Active Bookings */}
        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-[#004c80]/5">
                  <th className="text-left py-2 px-4 text-[#004c80]">หมายเลข</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">วัตถุประสงค์</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">ปลายทาง</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">วันเวลา</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-[#0076c3]/5">
                      <td className="py-2 px-4 whitespace-nowrap font-mono">{b.id.substring(0, 8)}...</td>
                      <td className="py-2 px-4">{b.purpose || '-'}</td>
                      <td className="py-2 px-4">{b.endLocation || '-'}</td>
                      <td className="py-2 px-4">{b.startTime ? new Date(b.startTime).toLocaleString('th-TH') : '-'}</td>
                      <td className="py-2 px-4"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10">
                      <div className="mx-auto max-w-md text-center">
                        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">🗒️</div>
                        <h3 className="text-lg font-semibold text-gray-800">ยังไม่มีคำขอของคุณ</h3>
                        <p className="text-sm text-gray-500 mt-1">เริ่มต้นสร้างคำขอแรกของคุณได้เลย</p>
                        <button onClick={() => setIsModalOpen(true)} className="mt-4 inline-block rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">+ สร้างคำขอใหม่</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Completed Bookings Section */}
        {!isLoading && completedBookings.length > 0 && (
          <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
            <h2 className="text-xl font-bold text-[#004c80] mb-4">การเดินทางที่เสร็จสิ้น</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-[#004c80]/5">
                    <th className="text-left py-2 px-4 text-[#004c80]">หมายเลข</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">วัตถุประสงค์</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">ปลายทาง</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">วันเวลา</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompleted.length > 0 ? (
                    filteredCompleted.map((b) => (
                      <tr key={b.id} className="border-b hover:bg-[#0076c3]/5">
                        <td className="py-2 px-4 whitespace-nowrap font-mono">{b.id.substring(0, 8)}...</td>
                        <td className="py-2 px-4">{b.purpose || '-'}</td>
                        <td className="py-2 px-4">{b.endLocation || '-'}</td>
                        <td className="py-2 px-4">{b.startTime ? new Date(b.startTime).toLocaleString('th-TH') : '-'}</td>
                        <td className="py-2 px-4"><StatusBadge status={b.status} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-500 text-sm">
                        ไม่พบรายการที่เสร็จสิ้นที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <BookingFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={() => {
          (async () => {
            const res = await fetch('/api/my/bookings');
            if (res.ok) setBookings(await res.json());
          })();
        }} />
      </div>
    </div>
  );
}

