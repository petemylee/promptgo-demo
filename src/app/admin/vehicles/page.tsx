// src/app/admin/vehicles/page.tsx
'use client';
import { useState, useEffect } from 'react';
import VehicleFormModal from './VehicleFormModal';

interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  type: string | null;
  capacity: number | null;
}

export default function VehicleManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const fetchVehicles = async () => {
    setIsLoading(true);
    const response = await fetch('/api/vehicles');
    const data = await response.json();
    setVehicles(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDelete = async (vehicleId: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลรถยนต์นี้?')) {
      await fetch(`/api/vehicles/${vehicleId}`, { method: 'DELETE' });
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

  if (isLoading) return <p className="p-8">Loading vehicles...</p>;

  return (
    <>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Vehicle Management</h1>
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Add New Vehicle
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">License Plate</th>
                <th className="text-left py-2 px-4">Brand & Model</th>
                <th className="text-left py-2 px-4">Type</th>
                <th className="text-left py-2 px-4">Capacity</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4 font-mono">{vehicle.licensePlate}</td>
                  <td className="py-2 px-4">{vehicle.brand} {vehicle.model}</td>
                  <td className="py-2 px-4">{vehicle.type}</td>
                  <td className="py-2 px-4">{vehicle.capacity}</td>
                  <td className="py-2 px-4">
                    <button 
                      onClick={() => handleEdit(vehicle)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded-md mr-2 hover:bg-yellow-600">
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(vehicle.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <VehicleFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onVehicleUpdated={fetchVehicles}
        initialData={editingVehicle}
      />
    </>
  );
}