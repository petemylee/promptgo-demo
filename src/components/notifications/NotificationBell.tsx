'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useNotificationsContext } from '@/components/notifications/NotificationsContext';

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

const MD_MIN = 768;

function useIsMdUp() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const mq = window.matchMedia(`(min-width: ${MD_MIN}px)`);
    mq.addEventListener('change', onStoreChange);
    return () => mq.removeEventListener('change', onStoreChange);
  }, []);
  const getSnapshot = useCallback(() => window.matchMedia(`(min-width: ${MD_MIN}px)`).matches, []);
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const { items, unreadCount, isLoading, markRead, refresh } = useNotificationsContext();
  const mdUp = useIsMdUp();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; right: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const base = roleBasePath(session?.user?.role ?? null);
  const inboxHref = `${base}/notifications`;
  const badge = formatBadge(unreadCount);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePopoverPosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn || !mdUp) {
      setPopoverStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const width = Math.min(400, Math.max(320, window.innerWidth - 24));
    setPopoverStyle({
      top: rect.bottom + 10,
      right: Math.max(12, window.innerWidth - rect.right),
      width,
    });
  }, [mdUp]);

  useLayoutEffect(() => {
    if (!open) return;
    if (mdUp) updatePopoverPosition();
  }, [open, mdUp, updatePopoverPosition]);

  useEffect(() => {
    if (!open || !mdUp) return;
    const onResize = () => updatePopoverPosition();
    const onScroll = () => updatePopoverPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, mdUp, updatePopoverPosition]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (sheetRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mdUp) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mdUp]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const notificationList = (density: 'comfortable' | 'compact') =>
    isLoading ? (
      <div className={density === 'comfortable' ? 'p-6 text-center text-sm text-slate-500' : 'p-4 text-sm text-slate-500'}>
        กำลังโหลด...
      </div>
    ) : items.length === 0 ? (
      density === 'comfortable' ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">ยังไม่มีการแจ้งเตือน</p>
          <p className="text-xs text-slate-500">เมื่อมีอัปเดตคำขอหรืองาน จะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-slate-500">ยังไม่มีการแจ้งเตือน</div>
      )
    ) : (
      <ul className="divide-y divide-slate-100">
        {(density === 'comfortable' ? items.slice(0, 12) : items.slice(0, 10)).map((n) => {
          const isUnread = !n.readAt;
          const rowPad = density === 'comfortable' ? 'px-4 py-4' : 'px-4 py-3';
          const titleCls =
            density === 'comfortable'
              ? isUnread
                ? 'text-[15px] font-semibold leading-snug text-slate-900'
                : 'text-[15px] font-medium leading-snug text-slate-800'
              : isUnread
                ? 'text-sm font-semibold text-slate-900'
                : 'text-sm font-medium text-slate-800';
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  if (isUnread) markRead(n.id).catch(() => {});
                  setOpen(false);
                  if (n.href) router.push(n.href);
                }}
                className={
                  'flex w-full gap-3 text-left transition hover:bg-slate-50 active:bg-slate-100 ' + rowPad
                }
              >
                <span
                  className={
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + (isUnread ? 'bg-[#0076c3]' : 'bg-slate-200')
                  }
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className={titleCls}>{n.title}</p>
                  {n.message && (
                    <p
                      className={
                        density === 'comfortable'
                          ? 'mt-1 text-sm leading-relaxed text-slate-600 line-clamp-2'
                          : 'mt-0.5 text-xs text-slate-500 line-clamp-2'
                      }
                    >
                      {n.message}
                    </p>
                  )}
                  {density === 'comfortable' && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      {new Date(n.createdAt).toLocaleString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );

  const sheet = !mdUp && (
    <>
      <button
        type="button"
        aria-label="ปิดการแจ้งเตือน"
        className="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-[3px]"
        onClick={() => setOpen(false)}
      />
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-[110] flex max-h-[min(92dvh,640px)] flex-col rounded-t-[1.35rem] bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.2)] ring-1 ring-slate-200/90 pb-[max(1rem,env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-sheet-title"
      >
        <div className="flex shrink-0 flex-col border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 pt-3 pb-3">
          <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-slate-300" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="notif-sheet-title" className="text-base font-bold tracking-tight text-slate-900">
                การแจ้งเตือน
              </h2>
              <p className="text-xs text-slate-500">แตะรายการเพื่อเปิดหน้าที่เกี่ยวข้อง</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="ปิด"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(inboxHref);
              }}
              className="w-full rounded-xl bg-[#0076c3] px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0063a8]"
            >
              ดูทั้งหมด
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{notificationList('comfortable')}</div>
      </div>
    </>
  );

  const popover = mdUp && (
    <div
      ref={popoverRef}
      className="fixed z-[110] flex max-h-[min(70dvh,520px)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80"
      style={
        popoverStyle
          ? {
              top: popoverStyle.top,
              right: popoverStyle.right,
              width: popoverStyle.width,
            }
          : { top: 0, right: 0, width: 360, opacity: 0, pointerEvents: 'none' }
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-popover-title"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
        <div className="min-w-0">
          <h2 id="notif-popover-title" className="text-sm font-bold text-slate-900">
            การแจ้งเตือน
          </h2>
          <p className="text-xs text-slate-500">ล่าสุด</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(inboxHref);
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            ดูทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="ปิด"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 max-h-[calc(min(70dvh,520px)-56px)] overflow-y-auto overscroll-contain">
        {notificationList('compact')}
      </div>
    </div>
  );

  const portalContent = (
    <>
      {sheet}
      {popover}
    </>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) refresh().catch(() => {});
            return next;
          });
        }}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-100"
        aria-label="การแจ้งเตือน"
        aria-expanded={open}
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
          <span className="absolute -top-0.5 -right-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
            {badge}
          </span>
        )}
      </button>

      {mounted && open && createPortal(portalContent, document.body)}
    </>
  );
}
