import { prisma } from '@/lib/prisma';
import type { Notification, NotificationSeverity } from '@prisma/client';
import { publishNotificationToUser } from '@/lib/notificationsStream';

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message?: string | null;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  severity?: NotificationSeverity;
};

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const created = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      href: input.href ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      severity: input.severity ?? 'INFO',
    },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: input.userId, readAt: null, archivedAt: null },
  });

  publishNotificationToUser(input.userId, {
    event: 'notification_created',
    data: {
      id: created.id,
      type: created.type,
      title: created.title,
      message: created.message,
      href: created.href,
      severity: created.severity,
      createdAt: created.createdAt.toISOString(),
      readAt: created.readAt?.toISOString() ?? null,
    },
  });

  publishNotificationToUser(input.userId, {
    event: 'unread_count',
    data: { unreadCount },
  });

  return created;
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  // Keep it simple and deterministic; this also ensures SSE fanout per user.
  const results: Notification[] = [];
  for (const input of inputs) {
    results.push(await createNotification(input));
  }
  return results;
}

