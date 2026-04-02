'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useNotificationsContext } from '@/components/notifications/NotificationsContext';

function roleHomePath(role?: string | null) {
  if (role === 'Admin') return '/admin/dashboard';
  if (role === 'Executive') return '/executive';
  if (role === 'Driver') return '/driver';
  return '/requester';
}

export default function NotificationsCenter() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, isLoading, loadMore, nextCursor, markRead } = useNotificationsContext();
  const homeHref = roleHomePath(session?.user?.role ?? null);

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(homeHref);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            aria-label="ย้อนกลับ"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            ย้อนกลับ
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[#004c80]">การแจ้งเตือน</h1>
            <p className="text-sm text-slate-600">รายการแจ้งเตือนภายในระบบ</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 shadow ring-1 ring-black/5 overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-sm text-slate-500">กำลังโหลด...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">ยังไม่มีการแจ้งเตือน</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isUnread) markRead(n.id).catch(() => {});
                        if (n.href) router.push(n.href);
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={
                            'mt-1 h-2.5 w-2.5 rounded-full ' + (isUnread ? 'bg-[#0076c3]' : 'bg-slate-200')
                          }
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className={'text-sm ' + (isUnread ? 'font-semibold text-slate-900' : 'text-slate-800')}>
                              {n.title}
                            </p>
                            <time className="shrink-0 text-xs text-slate-500">
                              {new Date(n.createdAt).toLocaleString('th-TH')}
                            </time>
                          </div>
                          {n.message && <p className="mt-1 text-sm text-slate-600">{n.message}</p>}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {nextCursor && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => loadMore().catch(() => {})}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              โหลดเพิ่มเติม
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

