import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../../shared/response/success.js";
import { HttpStatus } from "../../../shared/response/http-status.js";
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  updatePreferencesSchema,
} from "./notifications.schema.js";
import type { NotificationsService } from "./notifications.service.js";

export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // ── GET /students/me/notifications ──────────────────────────────────────
  listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = listNotificationsQuerySchema.parse(req.query);
      const studentId = res.locals.studentId as number;

      const result = await this.service.listNotifications(studentId, {
        isRead: query.is_read !== undefined ? query.is_read === "true" : undefined,
        type: query.type,
        limit: parseInt(query.limit, 10),
        cursor: query.cursor,
      });

      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── PATCH /students/me/notifications/:id/read ──────────────────────────
  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params = notificationIdParamSchema.parse(req.params);
      const studentId = res.locals.studentId as number;
      const notificationId = parseInt(params.id, 10);

      const result = await this.service.markAsRead(studentId, notificationId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── POST /students/me/notifications/mark-all-read ──────────────────────
  markAllAsRead = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.service.markAllAsRead(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── GET /students/me/notifications/unread-count ────────────────────────
  getUnreadCount = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.service.getUnreadCount(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── GET /students/me/notifications/preferences ─────────────────────────
  listPreferences = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = res.locals.studentId as number;
      const result = await this.service.listPreferences(studentId);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };

  // ── PUT /students/me/notifications/preferences ─────────────────────────
  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updatePreferencesSchema.parse(req.body);
      const studentId = res.locals.studentId as number;
      const result = await this.service.updatePreferences(studentId, dto);
      sendSuccess(res, result, HttpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
