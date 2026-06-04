import { Router }                   from 'express';
import { verifyJWT }                from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard }                from '../../../../middlewares/roleGuard.middleware';
import { notificationsRateLimiter } from '../../../../middlewares/rateLimiter.middleware';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notifications.controller';

const router = Router();

const m = [notificationsRateLimiter, verifyJWT, RoleGuard('school_admin')];

// #45 GET    /v1/school-admin/notifications
router.get('/',                     ...m, listNotifications);

// #46 GET    /v1/school-admin/notifications/unread-count
router.get('/unread-count',         ...m, getUnreadCount);

// #48 PUT    /v1/school-admin/notifications/read-all
// NOTE: registered BEFORE /:notificationId to avoid route conflict
router.put('/read-all',             ...m, markAllAsRead);

// #47 PUT    /v1/school-admin/notifications/:notificationId/read
router.put('/:notificationId/read', ...m, markAsRead);

// #49 DELETE /v1/school-admin/notifications/:notificationId
router.delete('/:notificationId',   ...m, deleteNotification);

export default router;




