// src/app/page.tsx
'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    const role = session?.user?.role;
    if (role === 'Admin') router.replace('/admin');
    else if (role === 'Driver') router.replace('/driver');
    else if (role === 'Executive') router.replace('/executive');
    else router.replace('/requester');
  }, [status, session, router]);

  return <div className="p-4">Loading...</div>;
}