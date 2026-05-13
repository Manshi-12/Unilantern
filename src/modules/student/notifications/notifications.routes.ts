import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { authenticate } from "../../../shared/middleware/authenticate.js";
import { NotificationsRepository } from "./notifications.repository.js";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";

const router = Router();

const controller = new NotificationsController(
  new NotificationsService(new NotificationsRepository()),
);

// All routes require authentication
router.use(authenticate);

// ── GET /students/me/notifications ───────────────────────────────────────────
// List notifications with optional filters (is_read, type) and cursor pagination
router.get(
  "/",
  rateLimiter("notifications_list", 120, 60, { identifier: "ip" }),
  controller.listNotifications,
);

// ── GET /students/me/notifications/unread-count ──────────────────────────────
// Get unread notification count (badge number)
router.get(
  "/unread-count",
  rateLimiter("notifications_unread", 120, 60, { identifier: "ip" }),
  controller.getUnreadCount,
);

// ── GET /students/me/notifications/preferences ───────────────────────────────
// List notification preferences (per type/channel)
router.get(
  "/preferences",
  rateLimiter("notifications_prefs_read", 30, 60, { identifier: "ip" }),
  controller.listPreferences,
);

// ── PUT /students/me/notifications/preferences ───────────────────────────────
// Update notification preferences
router.put(
  "/preferences",
  rateLimiter("notifications_prefs_write", 20, 60, { identifier: "ip" }),
  controller.updatePreferences,
);

// ── POST /students/me/notifications/mark-all-read ────────────────────────────
// Mark all unread notifications as read
router.post(
  "/mark-all-read",
  rateLimiter("notifications_mark_all", 10, 60, { identifier: "ip" }),
  controller.markAllAsRead,
);

// ── PATCH /students/me/notifications/:id/read ────────────────────────────────
// Mark a single notification as read
router.patch(
  "/:id/read",
  rateLimiter("notifications_mark_one", 60, 60, { identifier: "ip" }),
  controller.markAsRead,
);

export default router;
