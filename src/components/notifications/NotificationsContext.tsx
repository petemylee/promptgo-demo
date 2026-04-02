'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useNotifications, type UseNotificationsState } from '@/components/notifications/useNotifications';

const NotificationsContext = createContext<UseNotificationsState | null>(null);

/** ห่อครั้งเดียวต่อ layout — ให้กระดิ่ง + หน้า notifications ใช้ SSE/สถานะชุดเดียว (ไม่เปิด Prisma/connection ซ้ำ) */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const value = useNotifications();
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext(): UseNotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return ctx;
}
