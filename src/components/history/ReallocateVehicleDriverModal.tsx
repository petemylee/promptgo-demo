'use client';

import { useCallback, useEffect, useState } from 'react';

type VehicleOption = {
  id: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  type: string | null;
};

type DriverOption = {
  id: string;
  name: string | null;
  email: string;
  position: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingStatus: string;
  initialVehicleId: string;
  initialDriverId: string;
  hasDriverFeedback: boolean;
  onSaved: () => void;
};

export default function ReallocateVehicleDriverModal({
  isOpen,
  onClose,
  bookingId,
  bookingStatus,
  initialVehicleId,
  initialDriverId,
  hasDriverFeedback,
  onSaved,
}: Props) {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    setError('');
    try {
      const [vRes, uRes] = await Promise.all([fetch('/api/vehicles'), fetch('/api/users')]);
      if (!vRes.ok) throw new Error('โหลดรายการรถไม่สำเร็จ');
      if (!uRes.ok) throw new Error('โหลดรายการผู้ใช้ไม่สำเร็จ');
      const vData = (await vRes.json()) as VehicleOption[];
      const users = (await uRes.json()) as Array<DriverOption & { role: string; isActive?: boolean }>;
      setVehicles(vData);
      setDrivers(users.filter((u) => u.role === 'Driver' && u.isActive !== false));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVehicleId(initialVehicleId);
    setSelectedDriverId(initialDriverId);
    setError('');
    void loadOptions();
  }, [isOpen, initialVehicleId, initialDriverId, loadOptions]);

  const handleSave = async () => {
    if (!selectedVehicleId || !selectedDriverId) {
      setError('กรุณาเลือกรถและคนขับ');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocationUpdate: true,
          vehicleId: selectedVehicleId,
          driverId: selectedDriverId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'บันทึกไม่สำเร็จ');
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const showProgressWarning =
    bookingStatus === 'IN_PROGRESS' || bookingStatus === 'COMPLETED';

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-md max-h-[90vh] my-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-[#004c80]">แก้ไขจัดสรรรถและคนขับ</h2>
          <p className="mt-1 text-sm text-slate-600">
            ใช้เมื่อต้องแก้ข้อมูลจัดสรรหลังอนุมัติแล้ว — ระบบจะแจ้งคนขับและผู้ขอที่เกี่ยวข้อง
          </p>
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {hasDriverFeedback && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-200">
              รายการนี้มีการให้คะแนนคนขับแล้ว ไม่สามารถแก้ไขจัดสรรได้
            </div>
          )}

          {showProgressWarning && !hasDriverFeedback && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
              {bookingStatus === 'IN_PROGRESS'
                ? 'งานกำลังดำเนินการ — หากเปลี่ยนคนขับ คนขับเดิมจะไม่เห็นงานนี้ในรายการของตน และคนขับใหม่จะได้รับแจ้งเตือน'
                : 'งานเสร็จสิ้นแล้ว — การแก้ไขจะส่งผลต่อข้อมูลในประวัติและเอกสารที่พิมพ์ใหม่เท่านั้น (ไม่ส่ง LINE ถึงคนขับใหม่)'}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">{error}</div>
          )}

          {isLoadingOptions ? (
            <p className="text-sm text-slate-500">กำลังโหลดรายการรถและคนขับ...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รถยนต์ <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  disabled={hasDriverFeedback || isSaving}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60 disabled:bg-slate-100"
                >
                  <option value="">-- เลือกรถ --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} — {v.brand} {v.model} {v.type ? `(${v.type})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  คนขับ <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  disabled={hasDriverFeedback || isSaving}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60 disabled:bg-slate-100"
                >
                  <option value="">-- เลือกคนขับ --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.email} {d.position ? `(${d.position})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex gap-3 justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={isSaving}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={hasDriverFeedback || isSaving || isLoadingOptions || !selectedVehicleId || !selectedDriverId}
            className="px-4 py-2 rounded-lg bg-[#0076c3] text-white hover:bg-[#005b99] disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center justify-center min-w-[120px]"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                กำลังบันทึก...
              </>
            ) : (
              'บันทึก'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
