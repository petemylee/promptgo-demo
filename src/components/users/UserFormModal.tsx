'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ROLES, type Role } from '@/types/roles';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  position?: string | null;
  phoneNumber?: string | null;
  profileImageUrl?: string | null;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  initialData?: User | null;
  variant?: 'modal' | 'fullpage';
}

export default function UserFormModal({ isOpen, onClose, onUserUpdated, initialData, variant = 'modal' }: UserFormModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Requester');
  const [position, setPosition] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDriverPhoto, setSelectedDriverPhoto] = useState<File | null>(null);
  const [driverPhotoPreviewUrl, setDriverPhotoPreviewUrl] = useState<string | null>(null);
  const [existingDriverPhotoUrl, setExistingDriverPhotoUrl] = useState<string | null>(null);
  
  const isEditMode = !!initialData;

  useEffect(() => {
    if (isEditMode && initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setRole(initialData.role || 'Requester');
      setPosition(initialData.position || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setExistingDriverPhotoUrl(initialData.profileImageUrl ?? null);
      setSelectedDriverPhoto(null);
      setDriverPhotoPreviewUrl(null);
    } else {
      setName('');
      setEmail('');
      setRole('Requester');
      setPosition('');
      setPhoneNumber('');
      setExistingDriverPhotoUrl(null);
      setSelectedDriverPhoto(null);
      setDriverPhotoPreviewUrl(null);
    }
  }, [initialData, isEditMode]);

  useEffect(() => {
    if (!selectedDriverPhoto) return;
    const url = URL.createObjectURL(selectedDriverPhoto);
    setDriverPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedDriverPhoto]);

  if (variant === 'modal' && !isOpen) return null;
  if (variant === 'fullpage' && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const url = isEditMode ? `/api/users/${initialData?.id}` : '/api/users';
      const method = isEditMode ? 'PATCH' : 'POST';
      
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
      
      const body: { name: string; email: string; role: Role; position: string; phoneNumber?: string } = { 
        name: name.trim(), 
        email: email.trim(), 
        role, 
        position: position.trim(),
        ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {})
      };

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} user.`);
      }

      const savedUser = await response.json().catch(() => null);
      const userId: string | null = (isEditMode ? initialData?.id : savedUser?.id) ?? null;

      const shouldUploadDriverPhoto = role === 'Driver' && !!selectedDriverPhoto;
      if (shouldUploadDriverPhoto) {
        if (!userId) {
          throw new Error('ไม่พบ userId สำหรับอัปโหลดรูปคนขับ');
        }
        const formData = new FormData();
        formData.append('photo', selectedDriverPhoto as File);
        formData.append('userId', userId);
        const uploadRes = await fetch('/api/upload/driver-photo', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}));
          throw new Error(uploadData?.error || `Failed to upload driver photo (HTTP ${uploadRes.status})`);
        }
      }

      if (!isEditMode && savedUser && savedUser.emailSent === false) {
        setError('สร้างบัญชีแล้ว แต่ส่งอีเมลรหัสผ่านไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า SMTP');
        onUserUpdated();
        return;
      }

      onUserUpdated();
      onClose();
      
    } catch (err: unknown) {
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
      <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto space-y-4 flex-1">
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">ชื่อ <span className="text-red-500">*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">ตำแหน่ง <span className="text-red-500">*</span></label>
          <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">อีเมล <span className="text-red-500">*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" required />
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
          <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="เช่น 0812345678" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" />
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">ระดับสิทธิ์การเข้าถึง</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60">
            {ROLES.map(roleValue => (
              <option key={roleValue} value={roleValue}>{roleValue}</option>
            ))}
          </select>
        </div>

        {role === 'Driver' && (
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">รูปคนขับ</label>
            <div className="flex flex-col gap-3">
              {(driverPhotoPreviewUrl || existingDriverPhotoUrl) && (
                <div className="w-full">
                  <Image
                    src={driverPhotoPreviewUrl || existingDriverPhotoUrl || ''}
                    alt="Driver"
                    width={320}
                    height={320}
                    className="h-32 w-32 rounded-xl ring-1 ring-black/10 object-cover"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedDriverPhoto(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60 bg-white"
              />
              <p className="text-xs text-gray-500">รองรับไฟล์รูปภาพ ขนาดไม่เกิน 5MB</p>
            </div>
          </div>
        )}

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

