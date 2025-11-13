'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';

function Sidebar({ isOpen, onClose, session }: { isOpen: boolean; onClose: () => void; session: Session | null }) {
  const pathname = usePathname();
  const NavItem = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => {
    const isActive = pathname === href || (href !== '/executive' && pathname.startsWith(href));
    return (
      <li className="mb-1">
        <Link
          href={href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ring-1 ${
            isActive ? 'bg-white text-[#004c80] ring-white' : 'text-white/90 ring-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className={`grid h-6 w-6 place-items-center rounded-md ${isActive ? 'bg-[#004c80]/10 text-[#004c80]' : 'bg-white/10 text-white'}`}>{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <div
      className={`fixed top-0 bottom-0 left-0 z-30 w-64 text-white transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#004c80] to-[#0076c3]" />
      <div className="relative z-10 flex h-full flex-col pt-[73px] md:pt-4 p-4">
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 ring-1 ring-white/20">
          <div className="h-8 w-8 rounded-lg bg-white/20" />
          <div>
            <p className="text-sm leading-5 text-white/80">OFM</p>
            <h2 className="text-lg font-bold leading-5">PROMPTGO</h2>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <ul>
            <NavItem
              href="/executive"
              label="Dashboard"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M3 12a9 9 0 1 1 18 0h-2a7 7 0 1 0-7 7v2A9 9 0 0 1 3 12z"/>
                </svg>
              }
            />
            <NavItem
              href="/executive/approvals"
              label="รอยืนยัน"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
            />
            <NavItem
              href="/executive/history"
              label="ประวัติการยืนยัน"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
            />
            <NavItem
              href="/executive/my-bookings"
              label="My Bookings"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              }
            />
          </ul>
        </nav>
        <div className="mt-6 rounded-xl bg-white/5 px-3 py-3 text-xs text-white/80 ring-1 ring-white/10">
          <p className="mb-1">Signed in as</p>
          <p className="truncate font-medium text-white">{session?.user?.name || session?.user?.email || 'Unknown'}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate text-white/90 text-[11px]">{session?.user?.role}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white ring-1 ring-white/20 hover:bg-white/20 hover:ring-white/30"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M13 3a1 1 0 0 1 1 1v4h-2V5H6v14h6v-3h2v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h8z"/><path d="M16.293 7.293a1 1 0 0 1 1.414 0L22 11.586a1 1 0 0 1 0 1.414l-4.293 4.293a1 1 0 1 1-1.414-1.414L18.586 13H10a1 1 0 1 1 0-2h8.586l-2.293-2.293a1 1 0 0 1 0-1.414z"/></svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && session?.user?.role !== 'Executive') {
      router.replace('/');
    }
  }, [status, session, router]);

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'Executive')) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#f0f7ff] to-[#e6f3ff] text-slate-800">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} session={session} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white/80 backdrop-blur border-b border-white/60 shadow-sm p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
          <h1 className="text-xl font-bold">OFM PROMPTGO</h1>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className="relative z-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
          </button>
        </header>

        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black opacity-50 z-20 md:hidden"></div>}
        
        <main className="flex-1 md:mt-0 mt-[73px]">
          {children}
        </main>
      </div>
    </div>
  );
}