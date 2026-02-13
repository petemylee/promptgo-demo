'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import BookingFormModal from '@/components/BookingFormModal';
import BookingDetailModal from '@/components/BookingDetailModal';
import EditBookingModal from '@/components/EditBookingModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import DriverFeedbackModal from '@/components/DriverFeedbackModal';

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
  driverFeedback?: {
    id: string;
    rating: number;
    comment: string | null;
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

const InProgressBookingCard = ({ booking }: { booking: Booking }) => {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const getMapUrl = () => {
    if (!booking.endLocation) return null;

    if (googleMapsApiKey) {
      if (booking.startLocation) {
        const origin = encodeURIComponent(booking.startLocation);
        const destination = encodeURIComponent(booking.endLocation);
        return `https://www.google.com/maps/embed/v1/directions?key=${googleMapsApiKey}&origin=${origin}&destination=${destination}&zoom=12`;
      } else {
        const destination = encodeURIComponent(booking.endLocation);
        return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${destination}&zoom=12`;
      }
    }
    return null;
  };

  const mapUrl = getMapUrl();

  return (
    <div className="border border-indigo-200 rounded-lg p-6 bg-gradient-to-br from-indigo-50/50 to-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-[#004c80]">Booking #{booking.id.substring(0, 8)}</h3>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-gray-600">{booking.purpose || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-[#004c80]">แผนที่เส้นทาง</h4>
          {mapUrl ? (
            <div className="w-full h-80 rounded-lg overflow-hidden border border-gray-200">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src={mapUrl}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="w-full h-80 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-300 text-gray-600 grid place-items-center">
                  🗺️
                </div>
                <p className="text-gray-600 text-sm">
                  {!googleMapsApiKey
                    ? 'กรุณาตั้งค่า NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'
                    : !booking.endLocation
                    ? 'ข้อมูลตำแหน่งปลายทางไม่ครบถ้วน'
                    : 'ไม่สามารถแสดงแผนที่ได้'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-[#004c80]">รายละเอียด</h4>
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
            {booking.startLocation && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">จุดเริ่มต้น:</span>{' '}
                <span className="text-gray-900">{booking.startLocation}</span>
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium text-gray-700">ปลายทาง:</span>{' '}
              <span className="text-gray-900">{booking.endLocation || '-'}</span>
            </p>
          </div>
          {booking.driver && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h5 className="font-medium text-gray-700 mb-2">คนขับ</h5>
              <p className="text-sm text-gray-900">{booking.driver.name || booking.driver.email}</p>
              <p className="text-xs text-gray-500">{booking.driver.email}</p>
            </div>
          )}
          {booking.vehicle && (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h5 className="font-medium text-gray-700 mb-2">ยานพาหนะ</h5>
              <p className="text-sm font-semibold text-gray-900">{booking.vehicle.licensePlate}</p>
              <p className="text-xs text-gray-600">
                {booking.vehicle.brand} {booking.vehicle.model}
                {booking.vehicle.type && ` (${booking.vehicle.type})`}
              </p>
            </div>
          )}
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-1">
            <p className="text-sm">
              <span className="font-medium text-gray-700">เวลาเริ่ม:</span>{' '}
              <span className="text-gray-900">
                {booking.startTime ? new Date(booking.startTime).toLocaleString('th-TH') : '-'}
              </span>
            </p>
            {booking.endTime && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">เวลาสิ้นสุด:</span>{' '}
                <span className="text-gray-900">
                  {new Date(booking.endTime).toLocaleString('th-TH')}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MyBookingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ bookingId: string; driverId: string; driverName: string | null } | null>(null);

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

  const { activeBookings, completedBookings, inProgressBookings } = useMemo(() => {
    const active = bookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'IN_PROGRESS');
    const completed = bookings.filter(b => b.status === 'COMPLETED');
    const inProgress = bookings.filter(b => b.status === 'IN_PROGRESS');
    return { activeBookings: active, completedBookings: completed, inProgressBookings: inProgress };
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

  const handleViewDetails = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (bookingId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบคำขอนี้?')) {
      return;
    }
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ไม่สามารถลบคำขอได้');
      }
      const res = await fetch('/api/my/bookings');
      if (res.ok) {
        setBookings(await res.json());
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  };

  const reloadBookings = async () => {
    const res = await fetch('/api/my/bookings');
    if (res.ok) {
      setBookings(await res.json());
    }
  };

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
          <div className="flex gap-2">
            <button onClick={() => setIsProfileModalOpen(true)} className="rounded-xl bg-gray-600 px-4 py-2.5 text-white shadow hover:bg-gray-700">
              แก้ไขข้อมูลส่วนตัว
            </button>
            <button onClick={() => setIsModalOpen(true)} className="rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">+ สร้างคำขอใหม่</button>
          </div>
        </div>

        {!isLoading && inProgressBookings.length > 0 && (
          <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 mb-6">
            <h2 className="text-xl font-bold text-[#004c80] mb-4">งานที่กำลังดำเนินการ</h2>
            <div className="space-y-6">
              {inProgressBookings.map((booking) => (
                <InProgressBookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-[#004c80]/5">
                  <th className="text-left py-2 px-4 text-[#004c80]">หมายเลข</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">วัตถุประสงค์</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">ปลายทาง</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">วันเวลาเริ่ม</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">วันเวลาสิ้นสุด</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">สถานะ</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-[#0076c3]/5">
                      <td className="py-2 px-4 whitespace-nowrap font-mono">{b.id.substring(0, 8)}...</td>
                      <td className="py-2 px-4">{b.purpose || '-'}</td>
                      <td className="py-2 px-4">{b.endLocation || '-'}</td>
                      <td className="py-2 px-4">{b.startTime ? new Date(b.startTime).toLocaleString('th-TH') : '-'}</td>
                      <td className="py-2 px-4">{b.endTime ? new Date(b.endTime).toLocaleString('th-TH') : '-'}</td>
                      <td className="py-2 px-4"><StatusBadge status={b.status} /></td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(b.id)}
                            className="text-sm text-[#0076c3] hover:text-[#005b99] underline"
                          >
                            ดูรายละเอียด
                          </button>
                          {b.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleEdit(b.id)}
                                className="text-sm text-emerald-600 hover:text-emerald-700 underline"
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => handleDelete(b.id)}
                                className="text-sm text-red-600 hover:text-red-700 underline"
                              >
                                ลบ
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10">
                      <div className="mx-auto max-w-md text-center">
                        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#004c80] grid place-items-center">🗒️</div>
                        <h3 className="text-lg font-semibold text-gray-800">ยังไม่มีคำขอของคุณ</h3>
                        <p className="text-sm text-gray-500 mt-1">เริ่มต้นสร้างคำขอแรกของคุณได้เลย</p>
                        <button onClick={() => setIsModalOpen(true)} className="mt-4 inline-block rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">+ สร้างคำขอใหม่</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-500 text-sm">
                      {query.trim() ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ไม่มีรายการในหมวดนี้'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
                    <th className="text-left py-2 px-4 text-[#004c80]">วันเวลาเริ่ม</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">วันเวลาสิ้นสุด</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">สถานะ</th>
                    <th className="text-left py-2 px-4 text-[#004c80]">Actions</th>
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
                        <td className="py-2 px-4">{b.endTime ? new Date(b.endTime).toLocaleString('th-TH') : '-'}</td>
                        <td className="py-2 px-4"><StatusBadge status={b.status} /></td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleViewDetails(b.id)}
                              className="text-sm text-[#0076c3] hover:text-[#005b99] underline"
                            >
                              ดูรายละเอียด
                            </button>
                            {b.status === 'COMPLETED' && b.driver && !b.driverFeedback && (
                              <button
                                onClick={() => setFeedbackModal({
                                  bookingId: b.id,
                                  driverId: b.driver!.id,
                                  driverName: b.driver.name,
                                })}
                                className="text-sm text-amber-700 hover:text-amber-800 underline"
                              >
                                ⭐ ให้ Feedback คนขับ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-gray-500 text-sm">
                        ไม่พบรายการที่เสร็จสิ้นที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <BookingFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={reloadBookings}
        />
        {selectedBookingId && (
          <>
            <BookingDetailModal
              isOpen={isDetailModalOpen}
              onClose={() => {
                setIsDetailModalOpen(false);
                setSelectedBookingId(null);
              }}
              bookingId={selectedBookingId}
              onUpdated={reloadBookings}
            />
            <EditBookingModal
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false);
                setSelectedBookingId(null);
              }}
              bookingId={selectedBookingId}
              onUpdated={reloadBookings}
            />
          </>
        )}
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdated={() => {
            reloadBookings();
            window.location.reload();
          }}
        />
        {feedbackModal && (
          <DriverFeedbackModal
            bookingId={feedbackModal.bookingId}
            driverId={feedbackModal.driverId}
            driverName={feedbackModal.driverName}
            onClose={() => setFeedbackModal(null)}
            onSuccess={reloadBookings}
          />
        )}
      </div>
    </div>
  );
}
