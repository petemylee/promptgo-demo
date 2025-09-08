// src/app/admin/layout.tsx
'use client'; 
import Link from 'next/link';
import React, { useState } from 'react';

function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  return (
    <div 
      className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 text-white p-4 
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        transition-transform duration-300 ease-in-out 
        md:relative md:translate-x-0
      `}
      onClick={onClose} 
    >
      <h2 className="text-2xl font-bold mb-8">OFM PROMPTGO</h2>
      <nav>
        <ul>
          <li className="mb-4"><Link href="/admin/dashboard" className="hover:text-blue-300 p-2 block">Dashboard</Link></li>
          <li className="mb-4"><Link href="/admin/users" className="hover:text-blue-300 p-2 block">จัดการผู้ใช้</Link></li>
          <li className="mb-4"><Link href="/admin/vehicles" className="hover:text-blue-300 p-2 block">จัดการรถยนต์</Link></li>
        </ul>
      </nav>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">

        <header className="md:hidden bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-xl font-bold">OFM PROMPTGO</h1>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
          </button>
        </header>

        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black opacity-50 z-20 md:hidden"></div>}
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}