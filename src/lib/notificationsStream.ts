import type { NotificationSeverity } from '@prisma/client';

export type NotificationStreamEvent =
  | {
      event: 'notification_created';
      data: {
        id: string;
        type: string;
        title: string;
        message?: string | null;
        href?: string | null;
        severity: NotificationSeverity;
        createdAt: string;
        readAt?: string | null;
      };
    }
  | {
      event: 'unread_count';
      data: { unreadCount: number };
    }
  | {
      event: 'ping';
      data: { ts: number };
    };

type Client = {
  userId: string;
  send: (evt: NotificationStreamEvent) => void;
  close: () => void;
};

function getClients() {
  const g = globalThis as typeof globalThis & { __ofmNotifClients?: Set<Client> };
  if (!g.__ofmNotifClients) g.__ofmNotifClients = new Set<Client>();
  return g.__ofmNotifClients;
}

export function registerNotificationStreamClient(client: Client) {
  const clients = getClients();
  clients.add(client);
  return () => {
    clients.delete(client);
    client.close();
  };
}

export function publishNotificationToUser(userId: string, evt: NotificationStreamEvent) {
  for (const client of getClients()) {
    if (client.userId !== userId) continue;
    try {
      client.send(evt);
    } catch {
      // ignore broken client
    }
  }
}

