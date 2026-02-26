'use client';

interface LoadingScreenProps {
  /** ข้อความใต้ spinner */
  message?: string;
  /** true = เต็มจอ (ใช้ตอน login/ตรวจสอบ auth), false = แค่บล็อกกลาง (ใช้ในหน้า/โมดัล) */
  fullScreen?: boolean;
}

export default function LoadingScreen({ message = 'กำลังโหลด...', fullScreen = true }: LoadingScreenProps) {
  const content = (
    <div className="flex flex-col items-center gap-5">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#0076c3] border-t-transparent" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-[#f0f7ff] to-[#e6f3ff]">
        <div className="rounded-2xl bg-white/90 px-10 py-12 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <div className="text-center">
        {content}
      </div>
    </div>
  );
}
