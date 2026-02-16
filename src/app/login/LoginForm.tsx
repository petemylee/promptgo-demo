'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const LINE_ERROR_MESSAGE =
  'ยังไม่มีการเชื่อมต่อ LINE กรุณาล็อกอินด้วยอีเมลก่อน แล้วไปที่เมนู "เชื่อมต่อ LINE" ในแอป';

export default function LoginForm({
  initialLineError,
}: {
  initialLineError?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lineError, setLineError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (initialLineError === 'LineNotLinked') {
      setLineError(LINE_ERROR_MESSAGE);
    }
  }, [initialLineError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        router.push('/');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการ Login');
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
        <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl bg-white/10 shadow-2xl ring-1 ring-white/20 backdrop-blur-xl md:grid-cols-2">
          <div className="relative hidden items-center justify-center p-12 md:flex">
            <div className="text-white text-center md:text-left">
              <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm md:text-4xl">OFM PROMPTGO</h1>
              <p className="mt-3 text-white/90 text-lg">ระบบบริหารจัดการยานพาหนะ</p>
              <div className="mt-10 flex flex-wrap gap-2.5 text-sm text-white/90">
                <span className="rounded-full bg-white/15 px-4 py-2 ring-1 ring-white/25">ปลอดภัย</span>
                <span className="rounded-full bg-white/15 px-4 py-2 ring-1 ring-white/25">รวดเร็ว</span>
                <span className="rounded-full bg-white/15 px-4 py-2 ring-1 ring-white/25">ใช้งานง่าย</span>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-[#0076c3]/30 blur-3xl" />
            <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-[#004c80]/30 blur-3xl" />
          </div>

          <div className="relative bg-white p-8 md:p-10 lg:p-12">
            <div className="mb-8 text-center md:hidden">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">OFM PROMPTGO</h1>
              <p className="mt-1.5 text-slate-500">ระบบบริหารจัดการยานพาหนะ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">อีเมล</label>
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

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="password">รหัสผ่าน</label>
                  <a className="text-xs text-[#0076c3] hover:text-[#004c80] hover:underline" href="#">ลืมรหัสผ่าน?</a>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-[#0076c3] focus:outline-none focus:ring-2 focus:ring-[#0076c3]/20"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center">
                <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#0076c3] focus:ring-[#0076c3]" />
                  จดจำฉันไว้ในระบบ
                </label>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100" role="alert">
                  {error}
                </div>
              )}

              {lineError && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100" role="alert">
                  {lineError}
                </div>
              )}

              <button
                type="button"
                onClick={async () => {
                  await signOut({ redirect: false });
                  signIn('line', { callbackUrl: '/' });
                }}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#06C755] px-5 py-3.5 font-medium text-white shadow-md transition hover:bg-[#05b34a] focus:outline-none focus:ring-2 focus:ring-[#06C755]/50"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.348 0-.63-.285-.63-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .63.285.63.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314z" />
                </svg>
                Login with LINE
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-500">หรือเข้าสู่ระบบด้วยอีเมล</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-[#004c80] to-[#0076c3] px-5 py-3.5 font-medium text-white shadow-lg transition hover:shadow-xl hover:from-[#005b99] hover:to-[#0087de] disabled:opacity-70 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#0076c3]/50 focus:ring-offset-2"
              >
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              ยังไม่มีบัญชีผู้ใช้? <span className="text-slate-700">ติดต่อผู้ดูแลระบบ</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
