'use client';
import { useState, useEffect } from 'react';

// Interface สำหรับโครงสร้างข้อมูล Vehicle
interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  type: string | null;
  capacity: number | null;
  passengerCapacity: number | null;
  currentMileage: number | null;
}

// Props สำหรับ Component
interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdated: () => void;
  initialData?: Vehicle | null;
  variant?: 'modal' | 'fullpage';
}

export default function VehicleFormModal({ isOpen, onClose, onVehicleUpdated, initialData, variant = 'modal' }: VehicleFormModalProps) {
  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [passengerCapacity, setPassengerCapacity] = useState('');
  const [currentMileage, setCurrentMileage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditMode = !!initialData;

  // เติมข้อมูลลงฟอร์มเมื่อเป็นโหมดแก้ไข
  useEffect(() => {
    if (isEditMode && initialData) {
      setLicensePlate(initialData.licensePlate || '');
      setBrand(initialData.brand || '');
      setModel(initialData.model || '');
      setType(initialData.type || '');
      setCapacity(initialData.capacity?.toString() || '');
      setPassengerCapacity(initialData.passengerCapacity?.toString() || '');
      setCurrentMileage(initialData.currentMileage?.toString() || '');
    } else {
      // Reset ฟอร์มเมื่อเป็นโหมดเพิ่ม
      setLicensePlate('');
      setBrand('');
      setModel('');
      setType('');
      setCapacity('');
      setPassengerCapacity('');
      setCurrentMileage('');
    }
  }, [initialData, isEditMode]);

  if (variant === 'modal' && !isOpen) return null;
  if (variant === 'fullpage' && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = isEditMode ? `/api/vehicles/${initialData?.id}` : '/api/vehicles';
      const method = isEditMode ? 'PATCH' : 'POST';
      
      const body = { 
        licensePlate, 
        brand, 
        model, 
        type, 
        capacity: capacity ? parseInt(capacity, 10) : null,
        passengerCapacity: passengerCapacity ? parseInt(passengerCapacity, 10) : null,
        currentMileage: currentMileage ? parseInt(currentMileage, 10) : null
      };

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} vehicle.`);
      }
      
      onVehicleUpdated(); // สั่งให้หน้าหลักโหลดข้อมูลใหม่
      onClose(); // ปิด Modal
      
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

  const header = (
    <div className={`flex-shrink-0 flex items-center gap-4 px-4 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-gray-200 ${variant === 'fullpage' ? 'rounded-t-2xl' : ''}`}>
      {variant === 'fullpage' && (
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <span aria-hidden>←</span>
          <span>กลับ</span>
        </button>
      )}
      <h2 className={`text-2xl font-bold text-[#004c80] ${variant === 'fullpage' ? 'flex-1' : ''}`}>{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
      {variant === 'modal' && (
        <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="ปิด">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      {header}
      <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto space-y-4 flex-1">
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">License Plate*</label>
            <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
            </div>
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Brand</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" />
            </div>
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Model</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" />
            </div>
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Type</label>
            <input type="text" value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" />
            </div>
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">ความจุเครื่องยนต์ (CC)</label>
            <input type="number" step="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" placeholder="เช่น 1800" />
            </div>
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">จำนวนที่สามารถโดยสารได้ (คน)</label>
            <input type="number" step="1" min="1" value={passengerCapacity} onChange={(e) => setPassengerCapacity(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" placeholder="เช่น 5" />
            </div>
            <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">เลขไมล์ปัจจุบัน (กม.)</label>
            <input type="number" step="1" min="0" value={currentMileage} onChange={(e) => setCurrentMileage(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" placeholder="เช่น 50000" />
            </div>

            {error && <p className="text-red-500 text-center mb-2">{error}</p>}
      </div>

      <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-gray-200 flex justify-end gap-4 flex-shrink-0">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 ring-1 ring-black/10 bg-white hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isLoading} className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60">
          {isLoading ? 'Saving...' : (isEditMode ? 'Update Vehicle' : 'Save Vehicle')}
        </button>
      </div>
    </form>
  );

  if (variant === 'fullpage') {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl bg-white/90 shadow ring-1 ring-black/5 flex flex-col overflow-hidden">
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-md max-h-[90vh] my-auto rounded-2xl bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur flex flex-col">
        {formContent}
      </div>
    </div>
  );
}
