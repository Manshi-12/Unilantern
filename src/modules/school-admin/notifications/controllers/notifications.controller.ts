import { Request, Response }           from 'express';
import { asyncHandler }                from '../../../../shared/utils/asyncHandler';
import { ApiResponse }                 from '../../../../shared/responses/ApiResponse';
import { listNotificationsSchema }     from '../validators/notifications.validation';
import { BulkUpdatePreferencesDto }    from '../dto/bulk-update-preferences.dto';
import { UpdateSinglePreferenceDto }   from '../dto/update-single-preference.dto';
import * as NotificationsService       from '../services/notifications.service';

const getAdminId = (req: Request): number =>
  (req as any).jwtPayload.adminId as number;

// ─── #45 GET /notifications ───────────────────────────────────────────────────

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const admin_id = getAdminId(req);
  const parsed   = listNotificationsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters.', request_id: (req as any).requestId, details: {} },
    });
  }
  const { cursor, limit, is_read } = parsed.data;
  const is_read_bool = is_read === undefined ? undefined : is_read === 'true';
  ApiResponse.success(res, await NotificationsService.listNotifications(admin_id, limit, cursor, is_read_bool));
});

// ─── #46 GET /notifications/unread-count ─────────────────────────────────────

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await NotificationsService.getUnreadCount(getAdminId(req)));
});

// ─── #47 PUT /notifications/:notificationId/read ──────────────────────────────

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const admin_id        = getAdminId(req);
  const notification_id = Number(req.params.notificationId);
  await NotificationsService.markAsRead(admin_id, notification_id);
  ApiResponse.success(res, { message: 'Notification marked as read.' });
});

// ─── #48 PUT /notifications/read-all ─────────────────────────────────────────

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await NotificationsService.markAllAsRead(getAdminId(req));
  ApiResponse.success(res, { message: 'All notifications marked as read.' });
});

// ─── #49 DELETE /notifications/:notificationId ────────────────────────────────

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const admin_id        = getAdminId(req);
  const notification_id = Number(req.params.notificationId);
  await NotificationsService.deleteNotification(admin_id, notification_id);
  ApiResponse.success(res, { message: 'Notification deleted.' });
});

// ─── #50 GET /notification-preferences ───────────────────────────────────────

export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await NotificationsService.getPreferences(getAdminId(req)));
});

// ─── #51 PUT /notification-preferences/bulk ──────────────────────────────────

export const bulkUpdatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as BulkUpdatePreferencesDto;
  ApiResponse.success(res, await NotificationsService.bulkUpdatePreferences(getAdminId(req), body));
});

// ─── #52 PUT /notification-preferences/:type ─────────────────────────────────

export const updateSinglePreference = asyncHandler(async (req: Request, res: Response) => {
  const admin_id          = getAdminId(req);
  const notification_type = String(req.params.type);
  const body              = req.body as UpdateSinglePreferenceDto;
  ApiResponse.success(res, await NotificationsService.updateSinglePreference(admin_id, notification_type, body));
});




