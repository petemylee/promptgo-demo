'use client';
import { Fragment, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import BookingDetailModal from '@/components/BookingDetailModal';
import LoadingScreen from '@/components/LoadingScreen';
import type {
  ApprovalDashboardData,
  ApprovalDriver,
  ApprovalVehicle,
} from '@/types/approvals';
import { SIDEBAR_ROUTE_RESET_EVENT, type SidebarRouteResetDetail } from '@/lib/sidebarRouteReset';

type Props = {
  showHeader?: boolean;
  showStatsCards?: boolean;
  title?: string;
  description?: string;
  className?: string;
};

export default function ApproveAndAllocateBookings({
  showHeader = true,
  showStatsCards = true,
  title = 'อนุมัติและจัดสรรรถยนต์',
  description = 'รายการคำขอที่รอการอนุมัติเบื้องต้น',
  className,
}: Props) {
  const [data, setData] = useState<ApprovalDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<ApprovalVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [drivers, setDrivers] = useState<ApprovalDriver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [expandedBookingIds, setExpandedBookingIds] = useState<Set<string>>(() => new Set());
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailBookingId, setSelectedDetailBookingId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const pathname = usePathname();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings?adminDashboard=true');
      if (!response.ok) throw new Error('Failed to fetch data');
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  useEffect(() => {
    const reset = (e: Event) => {
      const detail = (e as CustomEvent<SidebarRouteResetDetail>).detail;
      if (detail?.href !== pathname) return;
      setShowVehicleModal(false);
      setSelectedBookingId(null);
      setSelectedVehicleId('');
      setSelectedDriverId('');
      setIsDetailModalOpen(false);
      setSelectedDetailBookingId(null);
      setShowRejectModal(false);
      setRejectBookingId(null);
      setRejectionReason('');
      setExpandedBookingIds(new Set());
    };
    window.addEventListener(SIDEBAR_ROUTE_RESET_EVENT, reset);
    return () => window.removeEventListener(SIDEBAR_ROUTE_RESET_EVENT, reset);
  }, [pathname]);

  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      const vehiclesData = await response.json();
      setVehicles(vehiclesData);
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Error: ${err.message}`);
      else alert('An unknown error occurred');
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
      const driversData = usersData.filter((user: ApprovalDriver) => user.role === 'Driver');
      setDrivers(driversData);
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Error: ${err.message}`);
      else alert('An unknown error occurred');
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
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update status');
      }

      setShowVehicleModal(false);
      setSelectedBookingId(null);
      setSelectedVehicleId('');
      setSelectedDriverId('');
      fetchDashboardData();
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Error: ${err.message}`);
      else alert('An unknown error occurred');
    }
  };

  const handleRejectClick = (bookingId: string) => {
    setRejectBookingId(bookingId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectBookingId) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      alert('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/bookings/${rejectBookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update status');
      }
      setShowRejectModal(false);
      setRejectBookingId(null);
      setRejectionReason('');
      fetchDashboardData();
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Error: ${err.message}`);
      else alert('An unknown error occurred');
    } finally {
      setIsRejecting(false);
    }
  };

  const toggleExpanded = (bookingId: string) => {
    setExpandedBookingIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  };

  const handleViewDetails = (bookingId: string) => {
    setSelectedDetailBookingId(bookingId);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className={className ?? 'p-4 md:p-8'}>
        <LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูล..." />
      </div>
    );
  }
  if (error) return <p className={(className ?? 'p-4 md:p-8') + ' text-red-500'}>Error: {error}</p>;

  if (isDetailModalOpen && selectedDetailBookingId && isDesktop) {
    return (
      <div className={className ?? 'p-4 md:p-8'}>
        <BookingDetailModal
          variant="fullpage"
          isOpen
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedDetailBookingId(null);
          }}
          bookingId={selectedDetailBookingId}
          onUpdated={fetchDashboardData}
        />
      </div>
    );
  }

  const pendingBookings = [...(data?.pendingBookings ?? [])].sort((a, b) => {
    const aTime = a.startTime ?? a.createdAt;
    const bTime = b.startTime ?? b.createdAt;
    const diff = new Date(bTime).getTime() - new Date(aTime).getTime();
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className={className ?? 'p-4 md:p-8'}>
      {showHeader && (
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-[#004c80]">{title}</h1>
          <p className="text-gray-700">{description}</p>
        </div>
      )}

      {showStatsCards && (
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
      )}

      <div className="rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#004c80]">รายการรออนุมัติเบื้องต้น</h2>
          <button
            onClick={fetchDashboardData}
            className="rounded-xl bg-[#0076c3] px-3 py-1.5 text-white shadow hover:bg-[#0087de]"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-[#004c80]/5">
                <th className="hidden md:table-cell text-left py-2 px-4 text-[#004c80]">Booking ID</th>
                <th className="hidden md:table-cell text-left py-2 px-4 text-[#004c80]">ผู้ขอใช้</th>
                <th className="hidden md:table-cell text-left py-2 px-4 text-[#004c80]">ตำแหน่ง</th>
                <th className="text-left py-2 px-4 text-[#004c80]">ปลายทาง</th>
                <th className="text-left py-2 px-4 text-[#004c80]">วันเวลาเริ่ม</th>
                <th className="text-left py-2 px-4 text-[#004c80]">วันเวลาสิ้นสุด</th>
                <th className="text-left py-2 px-4 text-[#004c80]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingBookings.length > 0 ? (
                pendingBookings.map((booking) => (
                  <Fragment key={booking.id}>
                    <tr className="border-b hover:bg-[#0076c3]/5">
                      <td className="hidden md:table-cell py-2 px-4">{booking.id.substring(0, 8)}...</td>
                      <td className="hidden md:table-cell py-2 px-4">
                        {booking.requestForSelf !== false ? booking.requester.name || '-' : booking.travelerName || '-'}
                      </td>
                      <td className="hidden md:table-cell py-2 px-4">
                        {booking.requestForSelf !== false ? booking.requester.position || '-' : booking.travelerPosition || '-'}
                      </td>
                      <td className="py-2 px-4">{booking.endLocation}</td>
                      <td className="py-2 px-4">
                        {booking.startTime ? new Date(booking.startTime).toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="py-2 px-4">
                        {booking.endTime ? new Date(booking.endTime).toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleViewDetails(booking.id)}
                            className="text-sm text-[#0076c3] hover:text-[#005b99] underline"
                          >
                            ดูรายละเอียด
                          </button>
                          <button
                            onClick={() => handleApproveClick(booking.id)}
                            className="rounded-md bg-white px-3 py-1 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
                          >
                            อนุมัติ
                          </button>
                          <button
                            onClick={() => handleRejectClick(booking.id)}
                            className="rounded-md bg-white px-3 py-1 text-red-600 ring-1 ring-red-200 hover:bg-red-50"
                          >
                            ปฏิเสธ
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(booking.id)}
                            className="md:hidden text-sm text-slate-700 hover:text-slate-900 underline"
                            aria-expanded={expandedBookingIds.has(booking.id)}
                          >
                            {expandedBookingIds.has(booking.id) ? 'ย่อ' : 'เพิ่มเติม'} {expandedBookingIds.has(booking.id) ? '▾' : '▸'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedBookingIds.has(booking.id) && (
                      <tr className="md:hidden border-b bg-slate-50/60">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-2 text-sm text-slate-900">
                            <div>
                              <span className="font-medium text-slate-700">Booking ID:</span>{' '}
                              <span>{booking.id.substring(0, 8)}...</span>
                            </div>
                            <div>
                              <span className="font-medium text-slate-700">ผู้ขอใช้:</span>{' '}
                              <span>{booking.requestForSelf !== false ? booking.requester.name || '-' : booking.travelerName || '-'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-slate-700">ตำแหน่ง:</span>{' '}
                              <span>{booking.requestForSelf !== false ? booking.requester.position || '-' : booking.travelerPosition || '-'}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">เลือกรถยนต์</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">เลือกคนขับ</label>
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

      {showRejectModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[90vh] my-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-semibold text-[#004c80]">ระบุเหตุผลในการปฏิเสธ</h2>
              <p className="mt-1 text-sm text-gray-600">เหตุผลนี้จะแสดงให้ผู้ขอทราบ</p>
            </div>
            <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 space-y-3">
              <label className="block text-sm font-medium text-gray-700">เหตุผล</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-red-500/30"
                placeholder="เช่น ข้อมูลไม่ครบ, วันเวลาซ้ำ, ไม่มีรถว่าง, ขอแก้ไขรายละเอียดแล้วส่งใหม่..."
              />
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={() => {
                  if (isRejecting) return;
                  setShowRejectModal(false);
                  setRejectBookingId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isRejecting}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                disabled={isRejecting || rejectionReason.trim().length === 0}
              >
                {isRejecting ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDetailBookingId && (
        <BookingDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedDetailBookingId(null);
          }}
          bookingId={selectedDetailBookingId}
          onUpdated={fetchDashboardData}
        />
      )}
    </div>
  );
}

