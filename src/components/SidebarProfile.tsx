'use client';
import { signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import ConnectLineButton from '@/components/ConnectLineButton';

interface SidebarProfileProps {
  session: Session | null;
  onOpenProfile: () => void;
}

export default function SidebarProfile({ session, onOpenProfile }: SidebarProfileProps) {
  return (
    <div className="mt-6 rounded-2xl bg-white/5 px-3 py-3.5 text-xs text-white/80 ring-1 ring-white/10 backdrop-blur-sm">
      <p className="mb-1 text-white/70">Signed in as</p>
      <p className="truncate font-medium text-white">{session?.user?.name || session?.user?.email || 'Unknown'}</p>
      {session?.user?.position != null && session.user.position !== '' && (
        <p className="mt-0.5 truncate text-white/80">ตำแหน่ง: {session.user.position}</p>
      )}
      <ConnectLineButton />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
        className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4z"/><path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25z"/></svg>
        แก้ไขข้อมูลส่วนตัว
      </button>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-white/90 text-xs">{session?.user?.role}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors"
          title="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M13 3a1 1 0 0 1 1 1v4h-2V5H6v14h6v-3h2v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h8z"/><path d="M16.293 7.293a1 1 0 0 1 1.414 0L22 11.586a1 1 0 0 1 0 1.414l-4.293 4.293a1 1 0 1 1-1.414-1.414L18.586 13H10a1 1 0 1 1 0-2h8.586l-2.293-2.293a1 1 0 0 1 0-1.414z"/></svg>
          Logout
        </button>
      </div>
    </div>
  );
}
