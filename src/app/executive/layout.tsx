'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import LineLinkFeedback from '@/components/LineLinkFeedback';
import ProfileViewPage from '@/components/ProfileViewPage';
import LoadingScreen from '@/components/LoadingScreen';
import { Suspense } from 'react';
import AppSidebar from '@/components/layout/AppSidebar';
import { executiveSidebarItems } from '@/config/sidebar/executive';
import NotificationBell from '@/components/notifications/NotificationBell';
import { NotificationsProvider } from '@/components/notifications/NotificationsContext';

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ปิด modal เมื่อเปลี่ยน tab/หน้า
  useEffect(() => {
    setShowProfileModal(false);
  }, [pathname]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && session?.user?.role !== 'Executive') {
      router.replace('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    // Intentionally no client-side page-view logging.
  }, [status, pathname]);

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'Executive')) {
    return <LoadingScreen fullScreen message="กำลังโหลด..." />;
  }

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-slate-50 via-[#f0f7ff] to-[#e6f3ff] text-slate-800">
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        session={session}
        onOpenProfile={() => {
          setIsSidebarOpen(false);
          setShowProfileModal(true);
        }}
        items={executiveSidebarItems}
      />
      <div className="flex flex-1 flex-col min-w-0 md:ml-64">
        <NotificationsProvider>
        <header className="md:hidden fixed top-0 left-0 right-0 z-50 pt-safe bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-slate-800">OFM PROMPTGO</h1>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
              className="relative z-50 p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              aria-label="เปิดเมนู"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
          </div>
        </header>

        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden transition-opacity" aria-hidden />}

        <main className="flex-1 min-w-0 pb-safe pt-mobile-app-header">
          <div className="hidden md:flex justify-end px-6 pt-5">
            <NotificationBell />
          </div>
          <Suspense fallback={null}>
            <LineLinkFeedback />
          </Suspense>
          {showProfileModal ? (
            <div className="p-4">
              <div className="mx-auto w-full max-w-5xl">
                <ProfileViewPage onClose={() => setShowProfileModal(false)} />
              </div>
            </div>
          ) : (
            children
          )}
        </main>
        </NotificationsProvider>
      </div>
    </div>
  );
}