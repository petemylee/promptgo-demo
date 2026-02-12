'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MyBookingsPage from '@/components/MyBookingsPage';

export default function RequesterMyBookings() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated' && session?.user?.role !== 'Requester') router.replace('/');
  }, [status, session, router]);

  return <MyBookingsPage />;
}
