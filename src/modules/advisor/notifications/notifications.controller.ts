import type {
  Request,
  Response,
  NextFunction,
}
from 'express'

import {

  NotificationIdParamSchema,
  CreateNotificationSchema,
  UpdatePreferencesSchema,

}
from './notifications.schema.js'

import {
  notificationsService,
}
from './notifications.service.js'

export const notificationsController = {

  // =====================================
  // API 47 — Get Notifications
  // =====================================

  getNotifications: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const advisorId =
      res.locals.advisorId

      const result =
        await notificationsService
          .getNotifications(
            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 48 — Get Unread Count
  // =====================================

  getUnreadCount: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const advisorId =
      res.locals.advisorId

      const result =
        await notificationsService
          .getUnreadCount(
            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 49 — Create Notification
  // =====================================

  createNotification: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const body =
        CreateNotificationSchema
          .parse(req.body)

      const advisorId =
      res.locals.advisorId

      const result =
        await notificationsService
          .createNotification(
            advisorId,
            body,
          )

      return res.status(201).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 50 — Mark As Read
  // =====================================

  markAsRead: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        NotificationIdParamSchema
          .parse(req.params)

      const advisorId =
      res.locals.advisorId

      const result =
        await notificationsService
          .markAsRead(

            Number(
              parsed.notificationId,
            ),

            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 51 — Mark All As Read
  // =====================================

  markAllAsRead: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const advisorId =
      res.locals.advisorId

      const result =
        await notificationsService
          .markAllAsRead(
            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 52 — Get Preferences
  // =====================================

  getPreferences: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const advisorId =
      res.locals.advisorId

      const result =
        await notificationsService
          .getPreferences(
            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 53 + 54 — Update Preferences
  // =====================================

  updatePreferences: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const body =
        UpdatePreferencesSchema
          .parse(req.body)

      const advisorId =
      res.locals.advisorId

      const result =
        await notificationsService
          .updatePreferences(
            advisorId,
            body,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },
}