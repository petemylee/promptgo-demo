'use client';

import type { SidebarItem } from '@/components/layout/AppSidebar';

export const adminSidebarItems: SidebarItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M3 12a9 9 0 1 1 18 0h-2a7 7 0 1 0-7 7v2A9 9 0 0 1 3 12z" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'ผู้ใช้',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm-7 9a7 7 0 0 1 14 0v1H5z" />
      </svg>
    ),
  },
  {
    href: '/admin/vehicles',
    label: 'รถยนต์',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H11a2 2 0 0 1-4 0H6a1 1 0 0 1-1-1v-6zm2.2-4l-1.2 3h11l-1.2-3a1 1 0 0 0-.95-.67H8.15A1 1 0 0 0 7.2 7zM7 16a1 1 0 1 0 1 1 1 1 0 0 0-1-1zm9 0a1 1 0 1 0 1 1 1 1 0 0 0-1-1z" />
      </svg>
    ),
  },
  {
    href: '/admin/history',
    label: 'ประวัติการอนุมัติ',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
  },
  {
    href: '/admin/feedback',
    label: 'Feedback คนขับ',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 2l2.75 5.57 6.15.9-4.45 4.34 1.05 6.12L12 16.95 6.5 18.93l1.05-6.12L3.1 8.47l6.15-.9L12 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/my-bookings',
    label: 'My Bookings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    ),
  },
  {
    href: '/admin/usage-logs',
    label: 'Usage Logs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 5a1 1 0 0 0-2 0v5a1 1 0 0 0 .29.71l3 3a1 1 0 0 0 1.42-1.42L13 11.59z" />
      </svg>
    ),
  },
];

