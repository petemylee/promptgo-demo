'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/components/notifications/useNotifications';

function roleBasePath(role?: string | null) {
  if (role === 'Admin') return '/admin';
  if (role === 'Executive') return '/executive';
  if (role === 'Driver') return '/driver';
  return '/requester';
}

function formatBadge(n: number) {
  if (n <= 0) return null;
  return n > 9 ? '9+' : String(n);
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const { items, unreadCount, isLoading, markAllRead, markRead } = useNotifications();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const base = roleBasePath(session?.user?.role ?? null);
  const inboxHref = `${base}/notifications`;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const el = panelRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const badge = formatBadge(unreadCount);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 transition"
        aria-label="การแจ้งเตือน"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9"
          />
        </svg>
        {badge && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[11px] leading-[18px] text-center">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile/tablet overlay */}
          <div
            className="sm:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            aria-hidden
            onClick={() => setOpen(false)}
          />

          {/* Panel: drawer on mobile, popover on >=sm */}
          <div className="z-50 sm:absolute sm:right-0 sm:mt-2 sm:w-[min(92vw,420px)] sm:rounded-2xl sm:bg-white sm:shadow-xl sm:ring-1 sm:ring-black/5 sm:overflow-hidden fixed sm:static inset-x-0 bottom-0 sm:inset-auto bg-white rounded-t-3xl shadow-2xl ring-1 ring-black/10 max-h-[85dvh] sm:max-h-[60vh] overflow-hidden">
            <div className="sm:hidden px-4 pt-3 pb-2">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">การแจ้งเตือน</p>
                <p className="text-xs text-slate-500">ล่าสุด</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAllRead().catch(() => {})}
                  className="text-xs font-medium text-[#0076c3] hover:text-[#005b99]"
                  disabled={unreadCount === 0}
                >
                  อ่านทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(inboxHref);
                  }}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900"
                >
                  ดูทั้งหมด
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[calc(85dvh-56px)] sm:max-h-[60vh]">
              {isLoading ? (
                <div className="p-4 text-sm text-slate-500">กำลังโหลด...</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">ยังไม่มีการแจ้งเตือน</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.slice(0, 10).map((n) => {
                    const isUnread = !n.readAt;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isUnread) markRead(n.id).catch(() => {});
                            setOpen(false);
                            if (n.href) router.push(n.href);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={
                                'mt-1 h-2.5 w-2.5 rounded-full ' + (isUnread ? 'bg-[#0076c3]' : 'bg-slate-200')
                              }
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={
                                  'text-sm ' + (isUnread ? 'font-semibold text-slate-900' : 'text-slate-800')
                                }
                              >
                                {n.title}
                              </p>
                              {n.message && <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.message}</p>}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

