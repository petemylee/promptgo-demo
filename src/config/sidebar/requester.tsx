'use client';

import type { SidebarItem } from '@/components/layout/AppSidebar';

export const requesterSidebarItems: SidebarItem[] = [
  {
    href: '/requester',
    label: 'My Bookings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M6 4a2 2 0 0 0-2 2v12l4-2 4 2 4-2 4 2V6a2 2 0 0 0-2-2H6z" />
      </svg>
    ),
  },
];

