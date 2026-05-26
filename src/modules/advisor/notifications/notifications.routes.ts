import {
  Router,
}
from 'express'

import {
  notificationsController,
}
from './notifications.controller.js'

const router = Router()

// =====================================
// API 47 — Get Notifications
// =====================================

router.get(
  '/',
  notificationsController
    .getNotifications,
)

// =====================================
// API 48 — Get Unread Count
// =====================================

router.get(
  '/unread-count',
  notificationsController
    .getUnreadCount,
)

// =====================================
// API 49 — Create Notification
// =====================================

router.post(
  '/',
  notificationsController
    .createNotification,
)

// =====================================
// API 50 — Mark As Read
// =====================================

router.patch(
  '/:notificationId/read',
  notificationsController
    .markAsRead,
)

// =====================================
// API 51 — Mark All As Read
// =====================================

router.patch(
  '/read-all',
  notificationsController
    .markAllAsRead,
)

// =====================================
// API 52 — Get Preferences
// =====================================

router.get(
  '/preferences',
  notificationsController
    .getPreferences,
)

// =====================================
// API 53 + 54 — Update Preferences
// =====================================

router.put(
  '/preferences',
  notificationsController
    .updatePreferences,
)

export default router