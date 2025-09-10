'use client';
import { useState, useEffect } from 'react';
import { ROLES, type Role } from '@/types/roles';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  position?: string | null;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  initialData?: User | null;
}

export default function UserFormModal({ isOpen, onClose, onUserUpdated, initialData }: UserFormModalProps) {
  // ... (ส่วน state และ useEffect คงไว้เหมือนเดิม)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Requester');
  const [position, setPosition] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditMode = !!initialData;

  useEffect(() => {
    if (isEditMode && initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setRole(initialData.role || 'Requester');
      setPosition(initialData.position || '');
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('Requester');
      setPosition('');
    }
  }, [initialData, isEditMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = isEditMode ? `/api/users/${initialData?.id}` : '/api/users';
      const method = isEditMode ? 'PATCH' : 'POST';
      
      // <-- แก้ไข: ใช้ const และกำหนด Type ให้ body
      const body: { name: string; email: string; role: Role; position: string; password?: string } = { name, email, role, position };
      if (!isEditMode) {
        body.password = password;
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} user.`);
      }
      
      onUserUpdated();
      onClose();
      
    } catch (err: unknown) { // <-- แก้ไข: ใช้ unknown
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ... (ส่วน return JSX คงไว้เหมือนเดิม)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur">
        <h2 className="text-2xl font-bold mb-6 text-[#004c80]">{isEditMode ? 'Edit User' : 'Add New User'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">ชื่อ</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">ตำแหน่ง</label>
            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
          </div>
          
          {!isEditMode && (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
            </div>
          )}

          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60">
              {ROLES.map(roleValue => (
                <option key={roleValue} value={roleValue}>{roleValue}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-500 text-center mb-2">{error}</p>}

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 ring-1 ring-black/10 bg-white hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isLoading} className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60">
              {isLoading ? 'Saving...' : (isEditMode ? 'Update User' : 'Save User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}