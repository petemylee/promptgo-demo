'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import BookingFormModal from '@/components/BookingFormModal';
import BookingDetailModal from '@/components/BookingDetailModal';
import EditBookingModal from '@/components/EditBookingModal';
import DriverFeedbackModal from '@/components/DriverFeedbackModal';
import LoadingScreen from '@/components/LoadingScreen';
import { requesterMayCancelBooking, requesterMayEditBookingDetails } from '@/lib/bookingRequesterWorkflow';

type Booking = {
  id: string;
  purpose: string | null;
  startLocation: string | null;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  status: 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MERGED';
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  driver: {
    id: string;
    name: string | null;
    email?: string | null;
    profileImageUrl?: string | null;
  } | null;
  vehicle: {
    id: string;
    licensePlate: string;
    brand: string | null;
    model: string | null;
    type: string | null;
    vehicleImageUrl?: string | null;
  } | null;
  driverFeedback?: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
};

type SessionRole = 'Requester' | 'Admin' | 'Executive' | 'Driver' | string;

const BOOKING_STATUSES = new Set<Booking['status']>([
  'PENDING',
  'APPROVED',
  'CONFIRMED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'MERGED',
]);

const asRecord = (v: unknown): Record<string, unknown> | null => {
  if (typeof v !== 'object' || v === null) return null;
  return v as Record<string, unknown>;
};

const asNullableString = (v: unknown): string | null => (typeof v === 'string' ? v : null);

const asIsoOrNull = (v: unknown): string | null => {
  if (typeof v === 'string' || v instanceof Date) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
};

const normalizeBooking = (b: unknown): Booking | null => {
  const obj = asRecord(b);
  if (!obj) return null;

  const id = asNullableString(obj.id);
  if (!id) return null;

  const statusRaw = asNullableString(obj.status);
  const status: Booking['status'] = statusRaw && BOOKING_STATUSES.has(statusRaw as Booking['status']) ? (statusRaw as Booking['status']) : 'PENDING';

  const driverObj = asRecord(obj.driver);
  const vehicleObj = asRecord(obj.vehicle);
  const feedbackObj = asRecord(obj.driverFeedback);

  return {
    id,
    purpose: asNullableString(obj.purpose),
    startLocation: asNullableString(obj.startLocation),
    endLocation: asNullableString(obj.endLocation),
    startTime: asIsoOrNull(obj.startTime),
    endTime: asIsoOrNull(obj.endTime),
    status,
    rejectionReason: asNullableString(obj.rejectionReason),
    rejectedAt: asIsoOrNull(obj.rejectedAt),
    createdAt: asIsoOrNull(obj.createdAt) ?? new Date().toISOString(),
    driver: driverObj
      ? {
          id: asNullableString(driverObj.id) ?? '',
          name: asNullableString(driverObj.name),
          email: asNullableString(driverObj.email),
          profileImageUrl: asNullableString(driverObj.profileImageUrl),
        }
      : null,
    vehicle: vehicleObj
      ? {
          id: asNullableString(vehicleObj.id) ?? '',
          licensePlate: asNullableString(vehicleObj.licensePlate) ?? '',
          brand: asNullableString(vehicleObj.brand),
          model: asNullableString(vehicleObj.model),
          type: asNullableString(vehicleObj.type),
          vehicleImageUrl: asNullableString(vehicleObj.vehicleImageUrl),
        }
      : null,
    driverFeedback: feedbackObj
      ? {
          id: asNullableString(feedbackObj.id) ?? '',
          rating: typeof feedbackObj.rating === 'number' ? feedbackObj.rating : Number(feedbackObj.rating),
          comment: asNullableString(feedbackObj.comment),
        }
      : null,
  };
};

const StatusBadge = ({ status }: { status: Booking['status'] }) => {
  const map: Record<Booking['status'], { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
    CONFIRMED: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'Confirmed' },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
    IN_PROGRESS: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'In Progress' },
    COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Completed' },
    CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Cancelled' },
    MERGED: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Merged' },
  };
  const p = map[status];
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${p.bg} ${p.text} ring-1 ring-black/5`}>{p.label}</span>;
};

const InProgressBookingCard = ({
  booking,
  onCancel,
  onEdit,
  onOpenImage,
}: {
  booking: Booking;
  onCancel: (id: string) => void;
  onEdit: (id: string) => void;
  onOpenImage: (src: string, alt: string) => void;
}) => {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-[#004c80]">Booking #{booking.id.substring(0, 8)}</h3>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-slate-600">{booking.purpose || '-'}</p>
        </div>
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
            {booking.driver.profileImageUrl && (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => onOpenImage(booking.driver!.profileImageUrl!, 'Driver Photo')}
                  className="inline-flex rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076c3]/60"
                  aria-label="ขยายรูปคนขับ"
                >
                  <Image
                    src={booking.driver.profileImageUrl}
                    alt="Driver Photo"
                    width={80}
                    height={80}
                    className="rounded-xl object-cover ring-1 ring-black/10"
                  />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-900">{booking.driver.name || booking.driver.email || '-'}</p>
            {!!booking.driver.email && <p className="text-xs text-gray-500">{booking.driver.email}</p>}
          </div>
        )}
        {booking.vehicle && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h5 className="font-medium text-gray-700 mb-2">ยานพาหนะ</h5>
            {booking.vehicle.vehicleImageUrl && (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => onOpenImage(booking.vehicle!.vehicleImageUrl!, 'Vehicle Photo')}
                  className="inline-flex rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0076c3]/60"
                  aria-label="ขยายรูปรถ"
                >
                  <Image
                    src={booking.vehicle.vehicleImageUrl}
                    alt="Vehicle Photo"
                    width={120}
                    height={80}
                    style={{ width: 'auto', height: 'auto' }}
                    className="rounded-xl object-cover ring-1 ring-black/10"
                  />
                </button>
              </div>
            )}
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
              <span className="text-gray-900">{new Date(booking.endTime).toLocaleString('th-TH')}</span>
            </p>
          )}
        </div>
        <div className="pt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(booking.id)}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          >
            แก้ไขรายละเอียด
          </button>
          <button
            type="button"
            onClick={() => onCancel(booking.id)}
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            ยกเลิกคำขอ
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MyBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ bookingId: string; driverId: string; driverName: string | null } | null>(null);
  const [expandedBookingIds, setExpandedBookingIds] = useState<Set<string>>(() => new Set());
  const [isDesktop, setIsDesktop] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('Image');

  const openLightbox = (src: string, alt: string) => {
    setLightboxSrc(src);
    setLightboxAlt(alt);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxSrc(null);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari fallback
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      const role: SessionRole | undefined = session?.user?.role as SessionRole | undefined;
      const endpoint = role === 'Admin' || role === 'Executive' ? '/api/bookings?all=true' : '/api/my/bookings';

      const res = await fetch(endpoint);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setBookings([]);
        setLoadError(err?.error || 'ไม่สามารถโหลดรายการได้');
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      const normalized: Booking[] = Array.isArray(data)
        ? data.map(normalizeBooking).filter((x): x is Booking => x !== null)
        : [];

      setBookings(
        normalized.map((b) => ({
          ...b,
          startLocation: b.startLocation ?? null,
        }))
      );
      setIsLoading(false);
    };
    if (status === 'authenticated') load();
  }, [status, session]);

  useEffect(() => {
    const handleOpenModal = () => setShowCreateForm(true);
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

  const toggleExpanded = (bookingId: string) => {
    setExpandedBookingIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  };

  const handleEdit = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsEditModalOpen(true);
  };

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำขอนี้?')) {
      return;
    }
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ไม่สามารถยกเลิกคำขอได้');
      }
      await reloadBookings();
      setSelectedBookingId(null);
      setIsDetailModalOpen(false);
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  };

  const reloadBookings = async () => {
    const role: SessionRole | undefined = session?.user?.role as SessionRole | undefined;
    const endpoint = role === 'Admin' || role === 'Executive' ? '/api/bookings?all=true' : '/api/my/bookings';

    const res = await fetch(endpoint);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      setBookings([]);
      setLoadError(err?.error || 'ไม่สามารถโหลดรายการได้');
      return;
    }
    setLoadError(null);
    const data = await res.json();
    const normalized: Booking[] = Array.isArray(data)
      ? data.map(normalizeBooking).filter((x): x is Booking => x !== null)
      : [];

    setBookings(
      normalized.map((b) => ({
        ...b,
        startLocation: b.startLocation ?? null,
      }))
    );
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

  if (status === 'loading') return <LoadingScreen fullScreen message="กำลังโหลด..." />;

  if (isDetailModalOpen && selectedBookingId && isDesktop) {
    return (
      <div className="relative min-h-screen p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <BookingDetailModal
            variant="fullpage"
            isOpen
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedBookingId(null);
            }}
            bookingId={selectedBookingId}
            onUpdated={reloadBookings}
            onCancelRequest={handleCancel}
            onEditRequest={(id) => {
              setIsDetailModalOpen(false);
              handleEdit(id);
            }}
          />
        </div>
      </div>
    );
  }

  if (isEditModalOpen && selectedBookingId) {
    return (
      <div className="relative min-h-screen p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <EditBookingModal
            variant="fullpage"
            isOpen
            bookingId={selectedBookingId}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedBookingId(null);
            }}
            onUpdated={async () => {
              await reloadBookings();
              setIsEditModalOpen(false);
              setSelectedBookingId(null);
            }}
          />
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="relative min-h-screen p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
        <div className="relative z-10 mx-auto w-full max-w-5xl">
          <BookingFormModal
            variant="fullpage"
            onClose={() => setShowCreateForm(false)}
            onCreated={async () => {
              await reloadBookings();
              setShowCreateForm(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#004c80]">My Bookings</h1>
          <p className="text-gray-700">ติดตามสถานะคำขอใช้รถยนต์ของคุณ</p>
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
            <button onClick={() => setShowCreateForm(true)} className="rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">+ ขอใช้รถยนต์</button>
          </div>
        </div>

        {!isLoading && inProgressBookings.length > 0 && (
          <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 mb-6">
            <h2 className="text-xl font-bold text-[#004c80] mb-4">รายการที่กำลังเดินทาง</h2>
            <div className="space-y-6">
              {inProgressBookings.map((booking) => (
                <InProgressBookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={handleCancel}
                  onEdit={handleEdit}
                  onOpenImage={openLightbox}
                />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5 mb-6">
          {loadError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {loadError}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-[#004c80]/5">
                  <th className="hidden md:table-cell text-left py-2 px-4 text-[#004c80]">หมายเลข</th>
                  <th className="hidden md:table-cell text-left py-2 px-4 text-[#004c80]">วัตถุประสงค์</th>
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
                    <td colSpan={7} className="py-12">
                      <LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูล..." />
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((b) => (
                    <Fragment key={b.id}>
                      <tr key={b.id} className="border-b hover:bg-[#0076c3]/5">
                        <td className="hidden md:table-cell py-2 px-4 whitespace-nowrap font-mono">{b.id.substring(0, 8)}...</td>
                        <td className="hidden md:table-cell py-2 px-4">{b.purpose || '-'}</td>
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
                            {requesterMayEditBookingDetails(b.status) && (
                              <button
                                onClick={() => handleEdit(b.id)}
                                className="text-sm text-emerald-600 hover:text-emerald-700 underline"
                              >
                                แก้ไข
                              </button>
                            )}
                            {requesterMayCancelBooking(b.status) && (
                              <button
                                onClick={() => handleCancel(b.id)}
                                className="text-sm text-red-600 hover:text-red-700 underline"
                              >
                                ยกเลิกคำขอ
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleExpanded(b.id)}
                              className="md:hidden text-sm text-slate-700 hover:text-slate-900 underline"
                              aria-expanded={expandedBookingIds.has(b.id)}
                            >
                              {expandedBookingIds.has(b.id) ? 'ย่อ' : 'เพิ่มเติม'} {expandedBookingIds.has(b.id) ? '▾' : '▸'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedBookingIds.has(b.id) && (
                        <tr className="md:hidden border-b bg-slate-50/60">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div>
                                <span className="font-medium text-slate-700">วัตถุประสงค์:</span>{' '}
                                <span className="text-slate-900">{b.purpose || '-'}</span>
                              </div>
                              {b.startLocation && (
                                <div>
                                  <span className="font-medium text-slate-700">จุดเริ่มต้น:</span>{' '}
                                  <span className="text-slate-900">{b.startLocation}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10">
                      <div className="mx-auto max-w-md text-center">
                        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#004c80] grid place-items-center">🗒️</div>
                        <h3 className="text-lg font-semibold text-gray-800">ยังไม่มีคำขอของคุณ</h3>
                        <p className="text-sm text-gray-500 mt-1">เริ่มต้นสร้างคำขอแรกของคุณได้เลย</p>
                        <button onClick={() => setShowCreateForm(true)} className="mt-4 inline-block rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">+ ขอใช้รถยนต์</button>
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
                    <th className="hidden md:table-cell text-left py-2 px-4 text-[#004c80]">หมายเลข</th>
                    <th className="hidden md:table-cell text-left py-2 px-4 text-[#004c80]">วัตถุประสงค์</th>
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
                      <Fragment key={b.id}>
                        <tr key={b.id} className="border-b hover:bg-[#0076c3]/5">
                          <td className="hidden md:table-cell py-2 px-4 whitespace-nowrap font-mono">{b.id.substring(0, 8)}...</td>
                          <td className="hidden md:table-cell py-2 px-4">{b.purpose || '-'}</td>
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
                                    driverName: b.driver!.name ?? '',
                                  })}
                                  className="text-sm text-amber-700 hover:text-amber-800 underline"
                                >
                                  ⭐ ให้ Feedback คนขับ
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleExpanded(b.id)}
                                className="md:hidden text-sm text-slate-700 hover:text-slate-900 underline"
                                aria-expanded={expandedBookingIds.has(b.id)}
                              >
                                {expandedBookingIds.has(b.id) ? 'ย่อ' : 'เพิ่มเติม'} {expandedBookingIds.has(b.id) ? '▾' : '▸'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedBookingIds.has(b.id) && (
                          <tr className="md:hidden border-b bg-slate-50/60">
                            <td colSpan={7} className="px-4 py-3">
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                <div>
                                  <span className="font-medium text-slate-700">วัตถุประสงค์:</span>{' '}
                                  <span className="text-slate-900">{b.purpose || '-'}</span>
                                </div>
                                {b.startLocation && (
                                  <div>
                                    <span className="font-medium text-slate-700">จุดเริ่มต้น:</span>{' '}
                                    <span className="text-slate-900">{b.startLocation}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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

        {selectedBookingId && (
          <BookingDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedBookingId(null);
            }}
            bookingId={selectedBookingId}
            onUpdated={reloadBookings}
            onCancelRequest={handleCancel}
            onEditRequest={(id) => {
              setIsDetailModalOpen(false);
              handleEdit(id);
            }}
          />
        )}
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

      {lightboxOpen && lightboxSrc && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="แสดงรูปขนาดใหญ่"
          onClick={closeLightbox}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute -top-3 -right-3 h-10 w-10 rounded-full bg-white text-slate-700 shadow ring-1 ring-black/10 hover:bg-slate-50"
              aria-label="ปิด"
            >
              ✕
            </button>
            <Image
              src={lightboxSrc}
              alt={lightboxAlt}
              width={1200}
              height={900}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
