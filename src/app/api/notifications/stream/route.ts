import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import {
  registerNotificationStreamClient,
  type NotificationStreamEvent,
} from '@/lib/notificationsStream';

function formatSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.id;

  const unreadCount = await prisma.notification.count({
    where: { userId, readAt: null, archivedAt: null },
  });

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (evt: NotificationStreamEvent) => {
        controller.enqueue(encoder.encode(formatSse(evt.event, evt.data)));
      };

      // Initial sync
      send({ event: 'unread_count', data: { unreadCount } });

      const unregister = registerNotificationStreamClient({
        userId,
        send,
        close: () => {
          try {
            controller.close();
          } catch {
            // ignore
          }
        },
      });

      const ping = setInterval(() => {
        try {
          send({ event: 'ping', data: { ts: Date.now() } });
        } catch {
          // ignore
        }
      }, 25_000);

      cleanup = () => {
        clearInterval(ping);
        unregister();
      };
    },
    cancel(reason) {
      void reason;
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

