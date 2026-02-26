'use client';
import { useState, useEffect } from 'react';
import { ROLES, type Role } from '@/types/roles';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  position?: string | null;
  phoneNumber?: string | null;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  initialData?: User | null;
  variant?: 'modal' | 'fullpage';
}

export default function UserFormModal({ isOpen, onClose, onUserUpdated, initialData, variant = 'modal' }: UserFormModalProps) {
  // ... (ส่วน state และ useEffect คงไว้เหมือนเดิม)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Requester');
  const [position, setPosition] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditMode = !!initialData;

  useEffect(() => {
    if (isEditMode && initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setRole(initialData.role || 'Requester');
      setPosition(initialData.position || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('Requester');
      setPosition('');
      setPhoneNumber('');
    }
  }, [initialData, isEditMode]);

  if (variant === 'modal' && !isOpen) return null;
  if (variant === 'fullpage' && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = isEditMode ? `/api/users/${initialData?.id}` : '/api/users';
      const method = isEditMode ? 'PATCH' : 'POST';
      
      // <-- แก้ไข: ใช้ const และกำหนด Type ให้ body
      // ตรวจสอบว่าทุกช่องต้องกรอก
      if (!name || name.trim() === '') {
        setError('กรุณากรอกชื่อ');
        setIsLoading(false);
        return;
      }
      
      if (!email || email.trim() === '') {
        setError('กรุณากรอกอีเมล');
        setIsLoading(false);
        return;
      }
      
      if (!position || position.trim() === '') {
        setError('กรุณากรอกตำแหน่ง');
        setIsLoading(false);
        return;
      }
      
      if (!isEditMode && (!password || password.trim() === '')) {
        setError('กรุณากรอกรหัสผ่าน');
        setIsLoading(false);
        return;
      }
      
      const body: { name: string; email: string; role: Role; position: string; phoneNumber?: string; password?: string } = { 
        name: name.trim(), 
        email: email.trim(), 
        role, 
        position: position.trim(),
        ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {})
      };
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
      <h2 className={`text-2xl font-bold text-[#004c80] ${variant === 'fullpage' ? 'flex-1' : ''}`}>{isEditMode ? 'Edit User' : 'Add New User'}</h2>
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
      <div className={`px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto space-y-4 flex-1 ${variant === 'fullpage' ? '' : ''}`}>
            {/* Form fields */}
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">ชื่อ <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
            </div>
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">ตำแหน่ง <span className="text-red-500">*</span></label>
            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
            </div>
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
            </div>
            <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="เช่น 0812345678" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" />
            </div>
          
            {!isEditMode && (
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
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
      </div>

      <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-gray-200 flex justify-end gap-4 flex-shrink-0">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 ring-1 ring-black/10 bg-white hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isLoading} className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60">
          {isLoading ? 'Saving...' : (isEditMode ? 'Update User' : 'Save User')}
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