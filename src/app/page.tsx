// src/app/page.tsx
'use client';
import { useSession, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  if (status === 'authenticated') {
    return (
      <div style={{ padding: '20px' }}>
        <h1>สวัสดี, {session.user?.name}</h1>
        <p>คุณได้เข้าสู่ระบบด้วย Role: <strong>{session.user?.role}</strong></p>
        <button 
          onClick={() => signOut()} 
          style={{ marginTop: '10px', padding: '5px 10px', cursor: 'pointer' }}
        >
          ออกจากระบบ
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>กรุณาเข้าสู่ระบบ</h1>
      <a href="/login" style={{ color: 'blue' }}>ไปที่หน้า Login</a>
    </div>
  );
}