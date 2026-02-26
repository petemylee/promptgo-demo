'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        return;
      }
      setSent(true);
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#004c80] via-[#0066ad] to-[#0076c3]" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#0076c3]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#004c80]/25 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white/10 shadow-2xl ring-1 ring-white/20 backdrop-blur-xl">
          <div className="bg-white p-8 md:p-10">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">ลืมรหัสผ่าน</h1>
              <p className="mt-1.5 text-slate-500 text-sm">
                กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์ให้คุณตั้งรหัสผ่านใหม่
              </p>
            </div>

            {sent ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-100">
                  ถ้ามีอีเมลในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่านทางอีเมล กรุณาตรวจสอบกล่องจดหมาย
                </div>
                <Link
                  href="/login"
                  className="block w-full rounded-xl bg-gradient-to-r from-[#004c80] to-[#0076c3] px-5 py-3.5 text-center font-medium text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#0076c3]/50 focus:ring-offset-2"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">
                    อีเมล
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-[#0076c3] focus:outline-none focus:ring-2 focus:ring-[#0076c3]/20"
                    placeholder="name@example.com"
                    required
                    autoComplete="email"
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
                  {isLoading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
                </button>
              </form>
            )}

            {!sent && (
              <p className="mt-6 text-center text-sm text-slate-500">
                <Link href="/login" className="text-[#0076c3] hover:text-[#004c80] hover:underline">
                  กลับไปหน้าเข้าสู่ระบบ
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
