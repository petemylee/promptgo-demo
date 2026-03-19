'use client';

import type { SidebarItem } from '@/components/layout/AppSidebar';

export const executiveSidebarItems: SidebarItem[] = [
  {
    href: '/executive',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M3 12a9 9 0 1 1 18 0h-2a7 7 0 1 0-7 7v2A9 9 0 0 1 3 12z" />
      </svg>
    ),
  },
  {
    href: '/executive/admin-approvals',
    label: 'อนุมัติและจัดสรรรถยนต์',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 1.5l8.5 4.5V12c0 5.02-3.2 9.52-8.5 10.5C6.7 21.52 3.5 17.02 3.5 12V6L12 1.5zm0 6.25a1 1 0 0 0-1 1V12c0 .27.11.52.29.71l2 2a1 1 0 1 0 1.42-1.42L13 11.59V8.75a1 1 0 0 0-1-1z" />
      </svg>
    ),
  },
  {
    href: '/executive/approvals',
    label: 'รอยืนยัน',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/executive/history',
    label: 'ประวัติการยืนยัน',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/executive/users',
    label: 'ผู้ใช้',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm-7 9a7 7 0 0 1 14 0v1H5z" />
      </svg>
    ),
  },
  {
    href: '/executive/vehicles',
    label: 'รถยนต์',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H11a2 2 0 0 1-4 0H6a1 1 0 0 1-1-1v-6zm2.2-4l-1.2 3h11l-1.2-3a1 1 0 0 0-.95-.67H8.15A1 1 0 0 0 7.2 7zM7 16a1 1 0 1 0 1 1 1 1 0 0 0-1-1zm9 0a1 1 0 1 0 1 1 1 1 0 0 0-1-1z" />
      </svg>
    ),
  },
  {
    href: '/executive/my-bookings',
    label: 'My Bookings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    ),
  },
  {
    href: '/executive/usage-logs',
    label: 'Usage Logs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 5a1 1 0 0 0-2 0v5a1 1 0 0 0 .29.71l3 3a1 1 0 0 0 1.42-1.42L13 11.59z" />
      </svg>
    ),
  },
];

