'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const hasValidToken = typeof token === 'string' && token.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (!hasValidToken || !token) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        return;
      }
      router.push('/login?reset=success');
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasValidToken) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#004c80] via-[#0066ad] to-[#0076c3]" />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white/10 shadow-2xl ring-1 ring-white/20 backdrop-blur-xl">
            <div className="bg-white p-8 md:p-10">
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
                ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาใช้ลิงก์จากอีเมลหรือขอลิงก์ใหม่
              </div>
              <Link
                href="/forgot-password"
                className="mt-4 block w-full rounded-xl bg-gradient-to-r from-[#004c80] to-[#0076c3] px-5 py-3.5 text-center font-medium text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#0076c3]/50 focus:ring-offset-2"
              >
                ขอลิงก์รีเซ็ตรหัสผ่านใหม่
              </Link>
              <p className="mt-6 text-center text-sm text-slate-500">
                <Link href="/login" className="text-[#0076c3] hover:text-[#004c80] hover:underline">
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#004c80] via-[#0066ad] to-[#0076c3]" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#0076c3]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#004c80]/25 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white/10 shadow-2xl ring-1 ring-white/20 backdrop-blur-xl">
          <div className="bg-white p-8 md:p-10">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">ตั้งรหัสผ่านใหม่</h1>
              <p className="mt-1.5 text-slate-500 text-sm">กรอกรหัสผ่านใหม่ที่ต้องการใช้</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="newPassword">
                  รหัสผ่านใหม่
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-[#0076c3] focus:outline-none focus:ring-2 focus:ring-[#0076c3]/20"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-[#0076c3] focus:outline-none focus:ring-2 focus:ring-[#0076c3]/20"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <div
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100"
                  role="alert"
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-[#004c80] to-[#0076c3] px-5 py-3.5 font-medium text-white shadow-lg transition hover:shadow-xl disabled:opacity-70 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#0076c3]/50 focus:ring-offset-2"
              >
                {isLoading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href="/login" className="text-[#0076c3] hover:text-[#004c80] hover:underline">
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#004c80] to-[#0076c3]">
          <span className="text-white">กำลังโหลด...</span>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
