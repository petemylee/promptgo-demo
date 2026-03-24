'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import VehicleFormModal from '@/components/vehicles/VehicleFormModal';
import LoadingScreen from '@/components/LoadingScreen';

interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string | null;
  color: string | null;
  model: string | null;
  type: string | null;
  capacity: number | null;
  passengerCapacity: number | null;
  currentMileage: number | null;
}

export default function VehicleManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'ไม่สามารถโหลดข้อมูลรถยนต์ได้');
      }

      if (!Array.isArray(data)) {
        throw new Error('รูปแบบข้อมูลรถยนต์ไม่ถูกต้อง');
      }

      setVehicles(data);
    } catch (err) {
      setVehicles([]);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูลรถยนต์');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDelete = async (vehicleId: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลรถยนต์นี้?')) {
      const response = await fetch(`/api/vehicles/${vehicleId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data?.error || 'ไม่สามารถลบข้อมูลรถยนต์ได้');
        return;
      }
      fetchVehicles();
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };
  
  const handleAdd = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const pathname = usePathname();
  useEffect(() => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  }, [pathname]);

  if (isLoading) return <div className="p-4 md:p-8"><LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูลรถยนต์..." /></div>;

  return (
    <div className="p-4 md:p-8">
      {isModalOpen ? (
        <div className="mx-auto w-full max-w-5xl">
          <VehicleFormModal
            variant="fullpage"
            isOpen
            onClose={handleCloseModal}
            onVehicleUpdated={fetchVehicles}
            initialData={editingVehicle}
          />
        </div>
      ) : (
        <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-[#004c80]">Vehicle Management</h1>
          <button onClick={handleAdd} className="bg-[#0076c3] text-white px-4 py-2 rounded-md shadow hover:bg-[#0087de] w-full md:w-auto">
            + Add New Vehicle
          </button>
        </div>
        <div className="bg-white/90 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-[#004c80]/5">
                  <th className="text-left py-2 px-4 text-[#004c80]">License Plate</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">Brand & Model</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">Color</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">Type</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">ความจุ (CC)</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">จำนวนที่สามารถโดยสารได้ (คน)</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">เลขไมล์ปัจจุบัน (กม.)</th>
                  <th className="text-left py-2 px-4 text-[#004c80]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b hover:bg-[#0076c3]/5">
                    <td className="py-2 px-4 font-mono whitespace-nowrap">{vehicle.licensePlate}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{vehicle.brand} {vehicle.model}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{vehicle.color || '-'}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{vehicle.type}</td>
                    <td className="py-2 px-4">{vehicle.capacity ?? '-'}</td>
                    <td className="py-2 px-4">{vehicle.passengerCapacity ?? '-'}</td>
                    <td className="py-2 px-4">
                      {vehicle.currentMileage !== null 
                        ? `${vehicle.currentMileage.toLocaleString()} กม.` 
                        : '-'}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(vehicle)}
                          aria-label="Edit vehicle"
                          className="group inline-flex items-center justify-center rounded-full p-2 ring-1 ring-[#004c80]/20 bg-white text-[#004c80] hover:bg-[#004c80]/5 hover:ring-[#004c80]/30 transition"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.713 0l-1.2 1.2 3.713 3.713 1.2-1.2a2.625 2.625 0 0 0 0-3.713z"/>
                            <path d="M3 17.25V21h3.75L19.573 8.177 15.86 4.464 3 17.25z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          aria-label="Delete vehicle"
                          className="group inline-flex items-center justify-center rounded-full p-2 ring-1 ring-red-200 bg-white text-red-600 hover:bg-red-50 hover:ring-red-300 transition"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2h13a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9z"/>
                            <path d="M7 9a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0v-8a1 1 0 0 1 1-1zm5 0a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0v-8a1 1 0 0 1 1-1zm6 0a1 1 0 0 0-1 1v8a1 1 0 1 0 2 0v-8a1 1 0 0 0-1-1z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

