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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">License Plate*</label>
            <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Brand</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Model</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Type</label>
            <input type="text" value={type} onChange={(e) => setType(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div className="mb-6">
            <label className="block mb-2">ความจุเครื่องยนต์ (CC)</label>
            <input type="number" step="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full p-2 border rounded" placeholder="เช่น 1800" />
          </div>

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
              {isLoading ? 'Saving...' : (isEditMode ? 'Update Vehicle' : 'Save Vehicle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
