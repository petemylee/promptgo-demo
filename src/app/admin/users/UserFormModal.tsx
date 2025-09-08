'use client';
import { useState, useEffect } from 'react';
import { ROLES, type Role } from '@/types/roles';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditMode = !!initialData;

  useEffect(() => {
    if (isEditMode && initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setRole(initialData.role || 'Requester');
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('Requester');
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
      const body: { name: string; email: string; role: Role; password?: string } = { name, email, role };
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit User' : 'Add New User'}</h2>
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <div className="mb-4">
            <label className="block mb-2">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
          </div>
          
          {!isEditMode && (
            <div className="mb-4">
              <label className="block mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded" required />
            </div>
          )}

          <div className="mb-6">
            <label className="block mb-2">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full p-2 border rounded">
              {ROLES.map(roleValue => (
                <option key={roleValue} value={roleValue}>{roleValue}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
              {isLoading ? 'Saving...' : (isEditMode ? 'Update User' : 'Save User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}