'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';
import LineLinkFeedback from '@/components/LineLinkFeedback';
import ProfileEditModal from '@/components/ProfileEditModal';
import SidebarProfile from '@/components/SidebarProfile';
import { Suspense } from 'react';

function Sidebar({ isOpen, onClose, session, onOpenProfile }: { isOpen: boolean; onClose: () => void; session: Session | null; onOpenProfile: () => void }) {
  const pathname = usePathname();
  const NavItem = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => {
    const isActive = pathname === href || pathname.startsWith(href);
    return (
      <li className="mb-1.5">
        <Link
          href={href}
          className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 ${
            isActive ? 'bg-white text-[#004c80] shadow-md' : 'text-white/90 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${isActive ? 'bg-[#004c80]/10 text-[#004c80]' : 'bg-white/10 text-white'}`}>{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <div
      className={`fixed top-0 bottom-0 left-0 z-30 w-64 text-white transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-out md:sticky md:top-0 md:h-screen md:flex-shrink-0 md:translate-x-0`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#004c80] via-[#0066ad] to-[#0076c3]" />
      <div className="relative z-10 flex h-full flex-col pt-[73px] md:pt-5 p-4">
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-sm">O</div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">OFM</p>
            <h2 className="text-lg font-bold leading-tight text-white">PROMPTGO</h2>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-1 -mx-1">
          <ul>
            <NavItem
              href="/requester"
              label="My Bookings"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M6 4a2 2 0 0 0-2 2v12l4-2 4 2 4-2 4 2V6a2 2 0 0 0-2-2H6z" />
                </svg>
              }
            />
          </ul>
        </nav>
        <SidebarProfile session={session} onOpenProfile={onOpenProfile} />
      </div>
    </div>
  );
}

export default function RequesterLayout({ children }: { children: React.ReactNode }) {
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
    if (status === 'authenticated' && session?.user?.role !== 'Requester') {
      router.replace('/');
    }
  }, [status, session, router]);

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'Requester')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#004c80] border-t-transparent" />
          <p className="text-sm text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-[#f0f7ff] to-[#e6f3ff] text-slate-800">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} session={session} onOpenProfile={() => setShowProfileModal(true)} />
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="md:hidden bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm px-4 py-3 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
          <h1 className="text-lg font-bold text-slate-800">OFM PROMPTGO</h1>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
            className="relative z-50 p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="เปิดเมนู"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </header>
        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden" aria-hidden />}
        <main className="flex-1 min-h-0 overflow-y-auto md:mt-0 mt-[57px]">
          <Suspense fallback={null}>
            <LineLinkFeedback />
          </Suspense>
          {showProfileModal ? (
            <div className="p-4">
              <div className="mx-auto w-full max-w-5xl">
                <ProfileEditModal
                  variant="fullpage"
                  isOpen
                  onClose={() => setShowProfileModal(false)}
                  onUpdated={() => setShowProfileModal(false)}
                />
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}


