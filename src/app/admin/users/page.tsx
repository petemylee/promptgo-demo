// src/app/admin/users/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import UserFormModal from './UserFormModal';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null); // <-- State ใหม่สำหรับเก็บข้อมูล User ที่จะแก้

  const fetchUsers = async () => {
    setIsLoading(true);
    const response = await fetch('/api/users');
    const data = await response.json();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?')) {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  // ฟังก์ชันสำหรับเปิด Modal ในโหมดแก้ไข
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  // ฟังก์ชันสำหรับเปิด Modal ในโหมดเพิ่ม
  const handleAdd = () => {
    setEditingUser(null); // ไม่มีข้อมูลเริ่มต้น = โหมดเพิ่ม
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };


  if (isLoading) return <p className="p-8">Loading users...</p>;

  return (
    <>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">User Management</h1>
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Add New User
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <table className="min-w-full">
            {/* ... thead ... */}
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{user.name}</td>
                  <td className="py-2 px-4">{user.email}</td>
                  <td className="py-2 px-4">{user.role}</td>
                  <td className="py-2 px-4">
                    {/* ปุ่ม Edit */}
                    <button 
                      onClick={() => handleEdit(user)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded-md mr-2 hover:bg-yellow-600">
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id)}
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

      <UserFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUserUpdated={fetchUsers}
        initialData={editingUser}
      />
    </>
  );
}