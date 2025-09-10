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
}

// Props สำหรับ Component
interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdated: () => void;
  initialData?: Vehicle | null;
}

export default function VehicleFormModal({ isOpen, onClose, onVehicleUpdated, initialData }: VehicleFormModalProps) {
  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('');
  const [capacity, setCapacity] = useState('');
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
    } else {
      // Reset ฟอร์มเมื่อเป็นโหมดเพิ่ม
      setLicensePlate('');
      setBrand('');
      setModel('');
      setType('');
      setCapacity('');
    }
  }, [initialData, isEditMode]);

  // ไม่แสดง Modal ถ้า isOpen เป็น false
  if (!isOpen) return null;

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
        capacity: capacity ? parseInt(capacity, 10) : null 
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur">
        <h2 className="text-2xl font-bold mb-6 text-[#004c80]">{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">ความจุเครื่องยนต์ (CC)</label>
            <input type="number" step="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" placeholder="เช่น 1800" />
          </div>

          {error && <p className="text-red-500 text-center mb-2">{error}</p>}

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 ring-1 ring-black/10 bg-white hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60">
              {isLoading ? 'Saving...' : (isEditMode ? 'Update Vehicle' : 'Save Vehicle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
