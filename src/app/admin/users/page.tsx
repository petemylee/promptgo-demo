'use client';
import { useState, useEffect } from 'react';
import type { Role } from '@/types/roles';
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
  const [editingUser, setEditingUser] = useState<User | null>(null);

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

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };
  
  const handleAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  if (isLoading) return <p className="p-4 md:p-8">Loading users...</p>;

  return (
    <>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">User Management</h1>
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full md:w-auto">
            + Add New User
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Name</th>
                  <th className="text-left py-2 px-4">Email</th>
                  <th className="text-left py-2 px-4">Role</th>
                  <th className="text-left py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 whitespace-nowrap">{user.name}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{user.email}</td>
                    <td className="py-2 px-4">{user.role}</td>
                    <td className="py-2 px-4 whitespace-nowrap">
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