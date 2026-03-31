import { useEffect, useRef, useState } from 'react';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  href: string | null;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  createdAt: string; // ISO
  readAt: string | null; // ISO
};

type NotificationListResponse = { items: NotificationItem[]; nextCursor: string | null };
type UnreadCountResponse = { unreadCount: number };

export type UseNotificationsState = {
  items: NotificationItem[];
  nextCursor: string | null;
  isLoading: boolean;
  unreadCount: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

export function useNotifications(): UseNotificationsState {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const sseConnectedRef = useRef(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        fetch('/api/notifications?limit=20'),
        fetch('/api/notifications/unread-count'),
      ]);
      const listJson = (await listRes.json()) as NotificationListResponse;
      const countJson = (await countRes.json()) as UnreadCountResponse;
      setItems(listJson.items);
      setNextCursor(listJson.nextCursor);
      setUnreadCount(countJson.unreadCount);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    const res = await fetch(`/api/notifications?limit=20&cursor=${encodeURIComponent(nextCursor)}`);
    const json = (await res.json()) as NotificationListResponse;
    setItems((prev) => [...prev, ...json.items]);
    setNextCursor(json.nextCursor);
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    const nowIso = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: nowIso })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    const nowIso = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: nowIso } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  useEffect(() => {
    let es: EventSource | null = null;
    let pollingTimer: number | null = null;

    const startPollingFallback = () => {
      if (pollingTimer) return;
      pollingTimer = window.setInterval(() => {
        fetch('/api/notifications/unread-count')
          .then((r) => r.json() as Promise<UnreadCountResponse>)
          .then((j) => setUnreadCount(j.unreadCount))
          .catch(() => {});
      }, 45_000);
    };

    refresh().catch(() => {});

    try {
      es = new EventSource('/api/notifications/stream');
      es.addEventListener('open', () => {
        sseConnectedRef.current = true;
      });
      es.addEventListener('error', () => {
        sseConnectedRef.current = false;
        startPollingFallback();
      });
      es.addEventListener('unread_count', (e) => {
        const data = JSON.parse((e as MessageEvent).data) as { unreadCount: number };
        setUnreadCount(data.unreadCount);
      });
      es.addEventListener('notification_created', (e) => {
        const data = JSON.parse((e as MessageEvent).data) as {
          id: string;
          type: string;
          title: string;
          message?: string | null;
          href?: string | null;
          severity: NotificationItem['severity'];
          createdAt: string;
          readAt?: string | null;
        };
        setItems((prev) => {
          const exists = prev.some((n) => n.id === data.id);
          if (exists) return prev;
          const next: NotificationItem = {
            id: data.id,
            type: data.type,
            title: data.title,
            message: data.message ?? null,
            href: data.href ?? null,
            severity: data.severity,
            createdAt: data.createdAt,
            readAt: data.readAt ?? null,
          };
          return [next, ...prev].slice(0, 50);
        });
      });
    } catch {
      startPollingFallback();
    }

    return () => {
      if (pollingTimer) window.clearInterval(pollingTimer);
      es?.close();
    };
  }, []);

  return { items, nextCursor, isLoading, unreadCount, refresh, loadMore, markAllRead, markRead };
}

