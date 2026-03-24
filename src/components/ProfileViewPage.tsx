'use client';
import { useState, useEffect } from 'react';
import ProfileEditModal from '@/components/ProfileEditModal';
import LoadingScreen from '@/components/LoadingScreen';
import ConnectLineButton from '@/components/ConnectLineButton';
import Image from 'next/image';

interface ProfileViewPageProps {
  onClose: () => void;
}

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  position: string | null;
  phoneNumber: string | null;
  signatureImageUrl: string | null;
  role: string;
}

export default function ProfileViewPage({ onClose }: ProfileViewPageProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users/me');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');
      }
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdated = () => {
    setShowEditModal(false);
    fetchProfile();
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white/90 shadow ring-1 ring-black/5 overflow-hidden">
        <LoadingScreen fullScreen={false} message="กำลังโหลดข้อมูล..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white/90 shadow ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-gray-600 hover:bg-gray-100"
          >
            <span aria-hidden>←</span>
            <span>กลับ</span>
          </button>
        </div>
        <div className="p-6 text-center text-red-600">{error || 'ไม่พบข้อมูล'}</div>
      </div>
    );
  }

  const rows: { label: string; value: string | null }[] = [
    { label: 'ชื่อ', value: profile.name },
    { label: 'อีเมล', value: profile.email },
    { label: 'ตำแหน่ง', value: profile.position },
    { label: 'เบอร์โทรศัพท์', value: profile.phoneNumber },
    { label: 'บทบาท', value: profile.role },
  ];

  return (
    <>
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white/90 shadow ring-1 ring-black/5 overflow-hidden">
        <div className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-gray-200 bg-white rounded-t-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <span aria-hidden>←</span>
            <span>กลับ</span>
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-[#004c80] flex-1">ข้อมูลส่วนตัว</h2>
        </div>

        <div className="p-6">
          <dl className="space-y-4">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-gray-100 last:border-0">
                <dt className="text-sm font-medium text-gray-500 sm:w-36 shrink-0">{label}</dt>
                <dd className="text-gray-900">{value ?? '-'}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">ลายเซ็นของฉัน</h3>
            {profile.signatureImageUrl ? (
              <div className="mt-3">
                <Image
                  src={profile.signatureImageUrl}
                  alt="Profile Signature"
                  width={280}
                  height={120}
                  className="max-h-28 border rounded-lg object-contain"
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600">ยังไม่ได้เพิ่มลายเซ็นในบัญชี</p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">การเชื่อมต่อ LINE</h3>
                <p className="mt-1 text-sm text-gray-600">เชื่อมต่อเพื่อรับการแจ้งเตือนผ่าน LINE และสามารถยกเลิกได้ที่นี่</p>
              </div>
            </div>
            <div className="mt-3">
              <ConnectLineButton />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-white bg-gradient-to-r from-[#004c80] to-[#0076c3] hover:from-[#005b99] hover:to-[#0087de] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4z"/>
                <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25z"/>
              </svg>
              แก้ไขข้อมูลส่วนตัว
            </button>
          </div>
        </div>
      </div>

      {showEditModal && (
        <ProfileEditModal
          variant="modal"
          isOpen
          onClose={() => setShowEditModal(false)}
          onUpdated={handleUpdated}
        />
      )}
    </>
  );
}
