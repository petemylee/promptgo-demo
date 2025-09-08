// src/app/login/page.tsx
'use client'; // บอก Next.js ว่านี่คือ Client Component เพราะมีการโต้ตอบกับผู้ใช้

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false, // ไม่ต้อง redirect อัตโนมัติ เราจะจัดการเอง
        email,
        password,
      });

      if (result?.error) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        router.push('/'); 
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการ Login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient background (brand colors) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#004c80] to-[#0076c3]"></div>

      {/* Decorative blurred blobs (subtle brand tones) */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#0076c3]/30 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#004c80]/30 blur-3xl"></div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white/10 shadow-2xl ring-1 ring-white/20 backdrop-blur-xl md:grid-cols-2">
          {/* Left panel (branding) */}
          <div className="relative hidden items-center justify-center p-10 md:flex">
            <div className="text-white">
              <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">OFM PROMPTGO</h1>
              <p className="mt-2 text-white/90">ระบบบริหารจัดการยานพาหนะ</p>
              <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/80">
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">Secure</span>
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">Fast</span>
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">Modern</span>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[#0076c3]/40 blur-2xl"></div>
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-[#004c80]/40 blur-2xl"></div>
          </div>

          {/* Right panel (form) */}
          <div className="relative bg-white p-8 md:p-10">
            <div className="mb-8 text-center md:hidden">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">OFM PROMPTGO</h1>
              <p className="mt-1 text-gray-500">ระบบบริหารจัดการยานพาหนะ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="email">อีเมล</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none ring-0 transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="password">รหัสผ่าน</label>
                  <a className="text-xs text-[#0076c3] hover:underline" href="#">ลืมรหัสผ่าน?</a>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none ring-0 transition focus:border-transparent focus:ring-2 focus:ring-[#0076c3]/60"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#0076c3] focus:ring-[#0076c3]" />
                  จดจำฉันไว้ในระบบ
                </label>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#004c80] to-[#0076c3] px-5 py-3 font-medium text-white shadow-lg transition hover:from-[#005b99] hover:to-[#0087de] disabled:from-[#004c80]/60 disabled:to-[#0076c3]/60"
              >
                <span className="relative z-10">{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
                <span className="absolute inset-0 -translate-x-full bg-white/20 transition group-hover:translate-x-0"></span>
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              ยังไม่มีบัญชีผู้ใช้? <span className="text-gray-700">ติดต่อผู้ดูแลระบบ</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}