'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { Role } from '@/types/roles';
import UserFormModal from './UserFormModal';
import LoadingScreen from '@/components/LoadingScreen';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  position?: string | null;
  phoneNumber?: string | null;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [query, setQuery] = useState('');

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

  const pathname = usePathname();
  useEffect(() => {
    setIsModalOpen(false);
    setEditingUser(null);
  }, [pathname]);

  if (isLoading) return <div className="p-4 md:p-8"><LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูลผู้ใช้..." /></div>;

  const filteredUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.position || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const RoleBadge = ({ role }: { role: Role }) => {
    const palette: Record<Role, { bg: string; text: string }> = {
      Requester: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
      Driver: { bg: 'bg-amber-50', text: 'text-amber-700' },
      Admin: { bg: 'bg-[#004c80]/10', text: 'text-[#004c80]' },
      Executive: { bg: 'bg-purple-50', text: 'text-purple-700' },
    };
    const p = palette[role];
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${p.bg} ${p.text} ring-1 ring-black/5`}>
        {role}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8">
      {isModalOpen ? (
        <div className="mx-auto w-full max-w-5xl">
          <UserFormModal
            variant="fullpage"
            isOpen
            onClose={handleCloseModal}
            onUserUpdated={fetchUsers}
            initialData={editingUser}
          />
        </div>
      ) : (
        <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#004c80]">User Management</h1>
            <p className="text-sm text-gray-700">จัดการผู้ใช้งาน ระบบ และกำหนดบทบาท</p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <div className="relative w-full md:w-80">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา: ชื่อ ตำแหน่ง อีเมล หรือบทบาท"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <button onClick={handleAdd} className="rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">
              + Add User
            </button>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur p-6 rounded-lg shadow-md ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b bg-[#004c80]/5">
                  <th className="text-left py-2 px-4 text-[#004c80] w-1/6">ชื่อ</th>
                  <th className="text-left py-2 px-4 text-[#004c80] w-1/6">ตำแหน่ง</th>
                  <th className="text-left py-2 px-4 text-[#004c80] w-1/5">Email</th>
                  <th className="text-left py-2 px-4 text-[#004c80] w-1/6">เบอร์โทร</th>
                  <th className="text-center py-2 px-4 text-[#004c80] w-24">Role</th>
                  <th className="text-center py-2 px-4 text-[#004c80] w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-[#0076c3]/5">
                    <td className="py-2 px-4 whitespace-nowrap">{user.name}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{user.position || '-'}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{user.email}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{user.phoneNumber || '-'}</td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex justify-center">
                        <RoleBadge role={user.role} />
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          aria-label="Edit user"
                          className="group inline-flex items-center justify-center rounded-full p-2 ring-1 ring-[#004c80]/20 bg-white text-[#004c80] hover:bg-[#004c80]/5 hover:ring-[#004c80]/30 transition"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.713 0l-1.2 1.2 3.713 3.713 1.2-1.2a2.625 2.625 0 0 0 0-3.713z"/>
                            <path d="M3 17.25V21h3.75L19.573 8.177 15.86 4.464 3 17.25z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          aria-label="Delete user"
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
                )) : (
                  <tr>
                    <td colSpan={6} className="py-10">
                      <div className="mx-auto max-w-md text-center">
                        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#0076c3]/10 text-[#0076c3] grid place-items-center">🙂</div>
                        <h3 className="text-lg font-semibold text-gray-800">ยังไม่มีผู้ใช้ที่ตรงกับคำค้นหา</h3>
                        <p className="text-sm text-gray-500 mt-1">ลองปรับคำค้นหาหรือเพิ่มผู้ใช้ใหม่</p>
                        <button onClick={handleAdd} className="mt-4 rounded-xl bg-[#0076c3] px-4 py-2.5 text-white shadow hover:bg-[#0087de]">+ Add User</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}