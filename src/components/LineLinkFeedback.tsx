'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LineLinkFeedback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const status = searchParams.get('line_linked');
  const reason = searchParams.get('reason');

  useEffect(() => {
    if (status !== 'success' && status !== 'error') return;
    setShow(true);
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('line_linked');
      next.delete('reason');
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
      setShow(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [status, pathname, router, searchParams]);

  if (!show || !status) return null;

  if (status === 'success') {
    return (
      <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
        เชื่อมต่อ LINE เรียบร้อยแล้ว คุณจะได้รับการแจ้งเตือนผ่าน LINE
      </div>
    );
  }

  const messages: Record<string, string> = {
    missing_params: 'ข้อมูลจาก LINE ไม่ครบ กรุณาลองใหม่อีกครั้ง',
    config: 'ระบบยังไม่ได้ตั้งค่า LINE Login',
    token: 'ไม่สามารถรับ Token จาก LINE ได้',
    profile: 'ไม่สามารถโหลดข้อมูล LINE ได้',
    already_used: 'บัญชี LINE นี้ผูกกับผู้ใช้อื่นแล้ว',
    server: 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่',
  };
  const message = messages[reason || ''] || 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่อีกครั้ง';

  return (
    <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
      {message}
    </div>
  );
}
