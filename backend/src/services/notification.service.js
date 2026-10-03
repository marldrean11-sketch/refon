import { prisma } from '../config/prisma.js'
import { ApiError } from '../utils/api-error.js'

function presentNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    message: notification.message,
    relatedListingId: notification.relatedListingId,
    relatedListing: notification.relatedListing
      ? {
          id: notification.relatedListing.id,
          brand: notification.relatedListing.brand,
          model: notification.relatedListing.model,
          status: notification.relatedListing.status,
        }
      : null,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  }
}

export async function getMyNotifications(userId) {
  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        relatedListing: {
          select: { id: true, brand: true, model: true, status: true },
        },
      },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  return {
    notifications: notifications.map(presentNotification),
    unreadCount,
  }
}

export async function markNotificationRead(id, userId) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true },
  })

  if (!notification) {
    throw new ApiError(404, 'Notification not found.', 'NOTIFICATION_NOT_FOUND')
  }

  const updatedNotification = await prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true },
    include: {
      relatedListing: {
        select: { id: true, brand: true, model: true, status: true },
      },
    },
  })

  return presentNotification(updatedNotification)
}

export async function markAllNotificationsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })

  return { updatedCount: result.count }
}
