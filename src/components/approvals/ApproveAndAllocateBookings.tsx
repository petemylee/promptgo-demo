'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import BookingDetailModal from '@/components/BookingDetailModal';
import LoadingScreen from '@/components/LoadingScreen';
import BookingSummaryHeader from '@/components/booking/BookingSummaryHeader';
import { routeTextWrapClass } from '@/components/booking/routeTextWrap';
import { formatDateTimeTH } from '@/lib/formatters';
import SuggestTextField, { type SuggestItem } from '@/components/SuggestTextField';
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
  const [certifiers, setCertifiers] = useState<Array<ApprovalDriver & { signatureImageUrl?: string | null }>>([]);
  const [selectedCertifierId, setSelectedCertifierId] = useState<string>('');
  const [certifierQuery, setCertifierQuery] = useState<string>('');
  const [hasPrefetchedOptions, setHasPrefetchedOptions] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailBookingId, setSelectedDetailBookingId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const pathname = usePathname();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings?adminDashboard=true');
      if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลได้');
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
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
    };
    window.addEventListener(SIDEBAR_ROUTE_RESET_EVENT, reset);
    return () => window.removeEventListener(SIDEBAR_ROUTE_RESET_EVENT, reset);
  }, [pathname]);

  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลรถยนต์ได้');
      const vehiclesData = await response.json();
      setVehicles(vehiclesData);
    } catch (err: unknown) {
      if (err instanceof Error) alert(`ข้อผิดพลาด: ${err.message}`);
      else alert('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  const fetchDrivers = async () => {
    setIsLoadingDrivers(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลคนขับได้');
      const usersData = await response.json();
      const driversData = usersData.filter((user: ApprovalDriver) => user.role === 'Driver');
      setDrivers(driversData);
      const certifierCandidates = usersData.filter(
        (user: ApprovalDriver & { isActive?: boolean }) =>
          user.role !== 'Driver' && user.role !== 'Requester' && user.isActive !== false
      );
      setCertifiers(certifierCandidates);
    } catch (err: unknown) {
      if (err instanceof Error) alert(`ข้อผิดพลาด: ${err.message}`);
      else alert('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  const prefetchOptions = async () => {
    if (hasPrefetchedOptions) return;
    await Promise.all([fetchVehicles(), fetchDrivers()]);
    setHasPrefetchedOptions(true);
  };

  useEffect(() => {
    // QoL: prefetch once to avoid wait on first approve click
    prefetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApproveClick = async (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setSelectedVehicleId('');
    setSelectedDriverId('');
    setSelectedCertifierId('');
    setCertifierQuery('');
    await prefetchOptions();
    setShowVehicleModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedBookingId) {
      alert('เกิดข้อผิดพลาด');
      return;
    }
    if (isApproving) return;

    setIsApproving(true);
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
        throw new Error(errorData?.error || 'ไม่สามารถอัปเดตสถานะได้');
      }

      // If booking is expressway, set certifier (optional at this step)
      const booking = data?.pendingBookings?.find((b) => b.id === selectedBookingId);
      if (booking?.expresswayOption === 'EXPRESSWAY' && selectedCertifierId) {
        await fetch(`/api/bookings/${selectedBookingId}/expressway-certifier`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ certifierUserId: selectedCertifierId }),
        });
      }

      await fetchDashboardData();

      setShowVehicleModal(false);
      setSelectedBookingId(null);
      setSelectedVehicleId('');
      setSelectedDriverId('');
      setSelectedCertifierId('');
      setCertifierQuery('');
    } catch (err: unknown) {
      if (err instanceof Error) alert(`ข้อผิดพลาด: ${err.message}`);
      else alert('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    } finally {
      setIsApproving(false);
    }
  };

  const certifierSuggestions = useMemo<SuggestItem[]>(() => {
    return certifiers
      .map((u) => {
        const primary = u.name?.trim() || u.email;
        const pos = u.position?.trim();
        const suffix = u.signatureImageUrl ? '✓ มีลายเซ็น' : 'ยังไม่มีลายเซ็น';
        const value = `${primary} — ${u.email}${pos ? ` (${pos})` : ''} · ${suffix}`;
        return { value, count: 0 };
      })
      .sort((a, b) => a.value.localeCompare(b.value, 'th'));
  }, [certifiers]);

  const applyCertifierQuery = (next: string) => {
    setCertifierQuery(next);
    const trimmed = next.trim();
    if (!trimmed) {
      setSelectedCertifierId('');
      return;
    }
    // Match by the formatted value we display in the dropdown.
    const found = certifiers.find((u) => {
      const primary = u.name?.trim() || u.email;
      const pos = u.position?.trim();
      const suffix = u.signatureImageUrl ? '✓ มีลายเซ็น' : 'ยังไม่มีลายเซ็น';
      const value = `${primary} — ${u.email}${pos ? ` (${pos})` : ''} · ${suffix}`;
      return value === trimmed;
    });
    if (found) setSelectedCertifierId(found.id);
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
        throw new Error(errorData?.error || 'ไม่สามารถอัปเดตสถานะได้');
      }
      setShowRejectModal(false);
      setRejectBookingId(null);
      setRejectionReason('');
      fetchDashboardData();
    } catch (err: unknown) {
      if (err instanceof Error) alert(`ข้อผิดพลาด: ${err.message}`);
      else alert('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    } finally {
      setIsRejecting(false);
    }
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
  if (error) return <p className={(className ?? 'p-4 md:p-8') + ' text-red-500'}>ข้อผิดพลาด: {error}</p>;

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
            <p className="mt-1 text-xs text-gray-400">รอการพิจารณา</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10" />
            <h3 className="text-sm font-medium text-gray-500">รอการยืนยัน</h3>
            <p className="mt-2 text-4xl font-extrabold text-[#004c80]">{data?.counts.approved ?? 0}</p>
            <p className="mt-1 text-xs text-gray-400">รอการยืนยัน</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow ring-1 ring-black/5">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/10" />
            <h3 className="text-sm font-medium text-gray-500">กำลังเดินทาง</h3>
            <p className="mt-2 text-4xl font-extrabold text-[#004c80]">{data?.counts.inProgress ?? 0}</p>
            <p className="mt-1 text-xs text-gray-400">กำลังเดินทาง</p>
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
            รีเฟรช
          </button>
        </div>
        {pendingBookings.length > 0 ? (
          <div className="space-y-4">
            {pendingBookings.map((booking) => {
              const who = booking.requestForSelf !== false ? booking.requester.name || '-' : booking.travelerName || '-';
              const whoPos = booking.requestForSelf !== false ? booking.requester.position || '-' : booking.travelerPosition || '-';

              return (
                <div key={booking.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-600">ผู้ขอใช้</div>
                          <div className="font-semibold text-slate-900 truncate">{who}</div>
                          <div className="text-xs text-slate-500 truncate">{whoPos}</div>
                        </div>
                      </div>

                      <BookingSummaryHeader
                        status="PENDING"
                        endLocation={booking.endLocation}
                        startTime={booking.startTime}
                        endTime={booking.endTime}
                      />

                      <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                          ดูรายละเอียดเพิ่มเติม
                        </summary>
                        <div className={`mt-3 grid grid-cols-1 gap-2 text-sm text-slate-900 ${routeTextWrapClass}`}>
                          <div>
                            <span className="font-medium text-slate-700">ปลายทาง:</span>{' '}
                            <span>{booking.endLocation || '-'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">วันเวลาเริ่ม:</span>{' '}
                            <span>{formatDateTimeTH(booking.startTime)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">วันเวลาสิ้นสุด:</span>{' '}
                            <span>{formatDateTimeTH(booking.endTime)}</span>
                          </div>
                        </div>
                      </details>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:w-[360px] md:grid-cols-2 md:self-center">
                      <button
                        type="button"
                        onClick={() => handleApproveClick(booking.id)}
                        className="col-span-2 inline-flex justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition"
                      >
                        อนุมัติ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectClick(booking.id)}
                        className="inline-flex justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50 transition"
                      >
                        ปฏิเสธ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewDetails(booking.id)}
                        className="inline-flex justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#004c80] ring-1 ring-slate-200 hover:bg-slate-50 transition"
                      >
                        ดูรายละเอียด
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 px-4 text-center text-gray-500">ไม่มีรายการรออนุมัติ</div>
        )}
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
                  {(() => {
                    const booking = data?.pendingBookings?.find((b) => b.id === selectedBookingId);
                    if (booking?.expresswayOption !== 'EXPRESSWAY') return null;
                    return (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        การเดินทางนี้เลือก <span className="font-semibold">ใช้ทางด่วน</span> — โปรดเลือกผู้รับรองเพื่อให้ระบบส่งคำขอรับรอง (ทำภายหลังได้ แต่แนะนำทำตอนนี้)
                      </div>
                    );
                  })()}

                  {(() => {
                    const booking = data?.pendingBookings?.find((b) => b.id === selectedBookingId);
                    if (booking?.expresswayOption !== 'EXPRESSWAY') return null;
                    return (
                      <div>
                        <SuggestTextField
                          label="ผู้รับรองทางด่วน (พิมพ์เพื่อค้นหา)"
                          value={certifierQuery}
                          onChange={applyCertifierQuery}
                          suggestions={certifierSuggestions}
                          rootClassName="mb-0"
                          inputClassName="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                          maxVisibleWhenEmpty={10}
                          maxVisibleFiltered={18}
                        />
                        <p className="mt-1 text-xs text-slate-600">
                          ผู้รับรองจะได้รับแจ้งเตือนในระบบ และสามารถเลือกใช้ลายเซ็นจากโปรไฟล์หรือเซ็นใหม่เฉพาะรายการได้
                        </p>
                      </div>
                    );
                  })()}

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
                  if (isApproving) return;
                  setShowVehicleModal(false);
                  setSelectedBookingId(null);
                  setSelectedVehicleId('');
                  setSelectedDriverId('');
                  setSelectedCertifierId('');
                  setCertifierQuery('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                disabled={isApproving}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApproveConfirm}
                disabled={isApproving}
                className="px-4 py-2 rounded-lg bg-[#0076c3] text-white hover:bg-[#005b99] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center min-w-[110px]"
              >
                {isApproving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังอนุมัติ...
                  </>
                ) : (
                  'อนุมัติ'
                )}
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

