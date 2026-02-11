'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const SCOPE = 'profile openid';

export default function ConnectLineButton() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [linked, setLinked] = useState<boolean | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/line/status')
      .then((res) => res.ok ? res.json() : { linked: false })
      .then((data) => setLinked(data.linked === true))
      .catch(() => setLinked(false));
  }, [status]);

  const handleConnect = () => {
    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!channelId || !baseUrl) {
      console.error('Missing NEXT_PUBLIC_LINE_CHANNEL_ID or NEXT_PUBLIC_BASE_URL');
      return;
    }
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/line/callback`;
    const state = encodeURIComponent(`${session?.user?.id ?? ''}|${pathname || '/'}`);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: redirectUri,
      state,
      scope: SCOPE,
    });
    window.location.href = `${LINE_AUTH_URL}?${params.toString()}`;
  };

  if (status !== 'authenticated' || !session?.user?.id) return null;

  if (linked === true) {
    return (
      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] text-emerald-200 ring-1 ring-white/20">
        <span className="font-medium">LINE</span>
        <span>เชื่อมต่อแล้ว</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#06C755] px-2.5 py-1.5 text-[11px] font-medium text-white ring-1 ring-white/20 hover:bg-[#05b34a]"
      title="เชื่อมต่อ LINE เพื่อรับการแจ้งเตือน"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
      เชื่อมต่อ LINE เพื่อรับการแจ้งเตือน
    </button>
  );
}
