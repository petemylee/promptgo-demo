// src/app/admin/layout.tsx
import Link from 'next/link';
import React from 'react';

// ส่วนประกอบ Sidebar ที่เราจะสร้างขึ้น
function Sidebar() {
  return (
    <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
      <h2 className="text-2xl font-bold mb-8">OFM PROMPTGO</h2>
      <nav>
        <ul>
          <li className="mb-4">
            <Link href="/admin/dashboard" className="hover:text-blue-300">
              Dashboard
            </Link>
          </li>
          <li className="mb-4">
            <Link href="/admin/users" className="hover:text-blue-300">
              จัดการผู้ใช้
            </Link>
          </li>
          <li className="mb-4">
            <Link href="/admin/vehicles" className="hover:text-blue-300">
              จัดการรถยนต์
            </Link>
          </li>
          {/* เพิ่มลิงก์อื่นๆ ในอนาคตได้ที่นี่ */}
        </ul>
      </nav>
    </div>
  );
}

// Layout หลักสำหรับส่วนของ Admin ทั้งหมด
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-100">
        {/* 'children' คือเนื้อหาของแต่ละหน้า เช่น หน้า Dashboard, หน้า Users */}
        {children}
      </main>
    </div>
  );
}