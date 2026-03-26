'use client';

import Link from 'next/link';
import React from 'react';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import SidebarProfile from '@/components/SidebarProfile';

export type SidebarItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

export default function AppSidebar({
  isOpen,
  onClose,
  session,
  onOpenProfile,
  items,
  brandInitial = 'O',
  brandTop = 'OFM',
  brandBottom = 'PROMPTGO',
}: {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  onOpenProfile: () => void;
  items: SidebarItem[];
  brandInitial?: string;
  brandTop?: string;
  brandBottom?: string;
}) {
  const pathname = usePathname();

  const isItemActive = (item: SidebarItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <div
      className={`fixed top-0 bottom-0 left-0 z-30 w-64 text-white transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-out md:h-[100dvh] md:translate-x-0`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#004c80] via-[#0066ad] to-[#0076c3]" />

      <div className="relative z-10 flex h-full flex-col pt-[73px] md:pt-5 p-4">
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-sm">
            {brandInitial}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">{brandTop}</p>
            <h2 className="text-lg font-bold leading-tight text-white">{brandBottom}</h2>
          </div>
        </div>

        <nav className="relative flex-1 min-h-0 py-1 -mx-1">
          <div className="sidebar-scroll h-full overflow-y-auto px-1">
            <ul>
              {items.map((item) => {
                const isActive = isItemActive(item);
                return (
                  <li key={item.href} className="mb-1.5">
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-[#004c80] shadow-md'
                          : 'text-white/90 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                          isActive ? 'bg-[#004c80]/10 text-[#004c80]' : 'bg-white/10 text-white'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <SidebarProfile session={session} onOpenProfile={onOpenProfile} />
      </div>
    </div>
  );
}

