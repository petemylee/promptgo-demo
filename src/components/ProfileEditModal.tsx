'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import LoadingScreen from '@/components/LoadingScreen';
import Image from 'next/image';
import SignaturePad from '@/components/SignaturePad';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  variant?: 'modal' | 'fullpage';
}

export default function ProfileEditModal({ isOpen, onClose, onUpdated, variant = 'modal' }: ProfileEditModalProps) {
  const { data: session, update } = useSession();
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const shouldLoad = variant === 'fullpage' || (variant === 'modal' && isOpen);
    if (shouldLoad && session?.user) {
      fetchUserData();
    } else if (!shouldLoad) {
      setName('');
      setPosition('');
      setPhoneNumber('');
      setEmail('');
      setSignatureImageUrl(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setError('');
    }
  }, [isOpen, session, variant]);

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
      setSignatureImageUrl(currentUser.signatureImageUrl || null);
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

      const wantToChangePassword = newPassword.trim().length > 0;
      if (wantToChangePassword) {
        if (!currentPassword.trim()) {
          setError('กรุณากรอกรหัสผ่านปัจจุบันเพื่อเปลี่ยนรหัสผ่าน');
          setIsLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
          setIsLoading(false);
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setError('รหัสผ่านใหม่กับยืนยันรหัสผ่านไม่ตรงกัน');
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          position: position.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          signatureImageUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ไม่สามารถอัปเดตข้อมูลได้');
      }

      if (wantToChangePassword) {
        const passwordResponse = await fetch('/api/users/me/password', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: currentPassword.trim(),
            newPassword: newPassword,
          }),
        });
        if (!passwordResponse.ok) {
          const data = await passwordResponse.json();
          throw new Error(data.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
        }
      }

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

  if (variant === 'modal' && !isOpen) return null;
  if (variant === 'fullpage' && !isOpen) return null;

  const header = (
    <div className={`flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-gray-200 bg-white ${variant === 'fullpage' ? 'rounded-t-2xl' : ''}`}>
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
      <h2 className={`text-xl sm:text-2xl font-bold text-[#004c80] ${variant === 'fullpage' ? 'flex-1' : ''}`}>แก้ไขข้อมูลส่วนตัว</h2>
      {variant === 'modal' && (
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
          aria-label="ปิด"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );

  const content = (
    <>
      {header}
      {isLoadingData ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูล..." />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={`flex flex-col flex-1 min-h-0 ${variant === 'fullpage' ? '' : ''}`}>
          <div className={`flex-1 ${variant === 'modal' ? 'overflow-y-auto' : ''}`}>
            <div className="max-w-lg mx-auto py-8 px-4 sm:px-6 space-y-4">
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
              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="block mb-3 text-sm font-medium text-gray-700">ลายเซ็นของฉัน</p>
                {signatureImageUrl ? (
                  <div className="space-y-3">
                    <div className="relative inline-block border-2 border-green-300 rounded-lg p-2 bg-green-50/50">
                      <Image
                        src={signatureImageUrl}
                        alt="Signature Preview"
                        width={300}
                        height={150}
                        className="max-h-32 border rounded-lg object-contain"
                      />
                    </div>
                    <p className="text-sm text-green-600 font-medium">✓ ตั้งค่าลายเซ็นแล้ว</p>
                    <button
                      type="button"
                      onClick={() => setSignatureImageUrl(null)}
                      className="text-xs text-red-600 hover:text-red-700 underline"
                      disabled={isLoading}
                    >
                      ลบลายเซ็น
                    </button>
                  </div>
                ) : (
                  <SignaturePad
                    onSignatureSave={setSignatureImageUrl}
                    onClear={() => setSignatureImageUrl(null)}
                    disabled={isLoading}
                    height={180}
                  />
                )}
                <p className="mt-2 text-xs text-gray-500">
                  เซ็นแล้วกด "บันทึกลายเซ็น" จากนั้นกด "บันทึกการแก้ไข" เพื่อบันทึกเข้าบัญชี
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="block mb-3 text-sm font-medium text-gray-700">เปลี่ยนรหัสผ่าน (ไม่บังคับ)</p>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 text-sm text-gray-600">รหัสผ่านปัจจุบัน</label>
                    <input 
                      type="password" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      placeholder="กรอกเมื่อต้องการเปลี่ยนรหัสผ่าน"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm text-gray-600">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="รหัสผ่านใหม่"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm text-gray-600">ยืนยันรหัสผ่านใหม่</label>
                    <input 
                      type="password" 
                      value={confirmNewPassword} 
                      onChange={(e) => setConfirmNewPassword(e.target.value)} 
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60" 
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
              {error && <p className="text-red-600 text-center text-sm">{error}</p>}
            </div>
          </div>
          <footer className="flex-shrink-0 border-t border-gray-200 bg-gray-50/80 px-4 sm:px-6 py-4">
            <div className="max-w-lg mx-auto flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 ring-1 ring-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                disabled={isLoading}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-xl px-4 py-2.5 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] disabled:opacity-60"
              >
                {isLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </footer>
        </form>
      )}
    </>
  );

  if (variant === 'fullpage') {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl bg-white/90 shadow ring-1 ring-black/5 flex flex-col overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {content}
    </div>
  );
}
