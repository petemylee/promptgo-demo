'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ProfileEditModal({ isOpen, onClose, onUpdated }: ProfileEditModalProps) {
  const { data: session, update } = useSession();
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (isOpen && session?.user) {
      fetchUserData();
    } else {
      setName('');
      setPosition('');
      setPhoneNumber('');
      setEmail('');
      setError('');
    }
  }, [isOpen, session]);

  const fetchUserData = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch('/api/users/me');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'ไม่สามารถโหลดข้อมูลได้');
      }
      
      const currentUser = await response.json();
      
      if (currentUser) {
        setName(currentUser.name || '');
        setPosition(currentUser.position || '');
        setPhoneNumber(currentUser.phoneNumber || '');
        setEmail(currentUser.email || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!session?.user?.id) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
      }

      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          position: position.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ไม่สามารถอัปเดตข้อมูลได้');
      }

      // Update session
      await update();
      onUpdated();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-md max-h-[90vh] my-auto rounded-2xl bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur flex flex-col">
        <div className="px-8 pt-8 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-[#004c80]">แก้ไขข้อมูลส่วนตัว</h2>
        </div>
        {isLoadingData ? (
          <div className="px-8 py-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0076c3] mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="px-8 py-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">ชื่อ*</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                  required 
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">ตำแหน่ง*</label>
                <input 
                  type="text" 
                  value={position} 
                  onChange={(e) => setPosition(e.target.value)} 
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                  required 
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Email*</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                  required 
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
                <input 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                  placeholder="เช่น 0812345678"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                />
              </div>
              {error && <p className="text-red-600 text-center text-sm">{error}</p>}
            </div>
            <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button 
                type="button" 
                onClick={onClose} 
                className="rounded-xl px-4 py-2 ring-1 ring-black/10 bg-white hover:bg-gray-50"
                disabled={isLoading}
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                disabled={isLoading} 
                className="rounded-xl px-4 py-2 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60"
              >
                {isLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
