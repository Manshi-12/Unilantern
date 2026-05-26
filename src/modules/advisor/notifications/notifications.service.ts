import type {

  NotificationsListResponseDto,

  CreateNotificationResponseDto,

  UnreadCountResponseDto,

  MarkReadResponseDto,

  MarkAllReadResponseDto,

  PreferencesResponseDto,

  UpdateAllPreferencesResponseDto,

}
from './dto/response.dto.js'

import {
  notificationsRepository,
}
from './notifications.repository.js'

import type {
  NotificationType,
  DeliveryChannel,
}
from './notifications.types.js'

import {
  AppError,
  NotFoundError,
}
from '../../../shared/errors/app-error.js'

export const notificationsService = {

  // =====================================
  // API 47 — Get Notifications
  // =====================================

  getNotifications: async (

    advisorId: number,

  ): Promise<
    NotificationsListResponseDto
  > => {

    const notifications =
      await notificationsRepository
        .findAllByAdvisor(
          advisorId,
        )

    const unread =
      notifications.filter(
        n => !n.is_read,
      ).length

    return {

      notifications,

      meta: {

        total:
          notifications.length,

        unread,
      },
    }
  },

  // =====================================
  // API 48 — Get Unread Count
  // =====================================

  getUnreadCount: async (

    advisorId: number,

  ): Promise<
    UnreadCountResponseDto
  > => {

    const unread_count =
      await notificationsRepository
        .getUnreadCount(
          advisorId,
        )

    return {
      unread_count,
    }
  },

  // =====================================
  // API 49 — Create Notification
  // =====================================

  createNotification: async (

    advisorId: number,

    body: {

      type: NotificationType

      title: string

      message: string

      delivery_channel?:
        DeliveryChannel
    },

  ): Promise<
    CreateNotificationResponseDto
  > => {

    const enabled =
      await notificationsRepository
        .isNotificationEnabled(

          advisorId,

          body.type,
        )

    if (!enabled) {

      throw new AppError(
        'NOTIFICATION_DISABLED',
        'Notification type disabled for advisor',
        403,
      )
    }

    const notification =
      await notificationsRepository
        .createNotification({

          advisor_id:
            advisorId,

          type:
            body.type,

          title:
            body.title,

          message:
            body.message,

          delivery_channel:
            body.delivery_channel
              ?? 'in_app',
        })

    return {

      message:
        'Notification created successfully.',

      notification,
    }
  },

  // =====================================
  // API 50 — Mark As Read
  // =====================================

  markAsRead: async (

    notificationId: number,

    advisorId: number,

  ): Promise<
    MarkReadResponseDto
  > => {

    const updated =
      await notificationsRepository
        .markAsRead(

          notificationId,

          advisorId,
        )

    if (!updated) {

      throw new NotFoundError(
        'Notification not found',
      )
    }

    return {

      message:
        'Notification marked as read.',

      notification_id:
        notificationId,
    }
  },

  // =====================================
  // API 51 — Mark All As Read
  // =====================================

  markAllAsRead: async (

    advisorId: number,

  ): Promise<
    MarkAllReadResponseDto
  > => {

    const updated_count =
      await notificationsRepository
        .markAllAsRead(
          advisorId,
        )

    return {

      message:
        'All notifications marked as read.',

      updated_count,
    }
  },

  // =====================================
  // API 52 — Get Preferences
  // =====================================

  getPreferences: async (

    advisorId: number,

  ): Promise<
    PreferencesResponseDto
  > => {

    const preferences =
      await notificationsRepository
        .getPreferences(
          advisorId,
        )

    return {
      preferences,
    }
  },

  // =====================================
  // API 53 + 54 — Update Preferences
  // =====================================

  updatePreferences: async (

    advisorId: number,

    body: {

      update_preference: {

        notification_type:
          NotificationType

        enabled: boolean

        delivery_channel:
          DeliveryChannel

      }[]
    },

  ): Promise<
    UpdateAllPreferencesResponseDto
  > => {

    const result =
      await notificationsRepository
        .updatePreferences(

          advisorId,

          body.update_preference,
        )

    return {

      message:
        'Preferences updated successfully.',

      updated_count:
        result.updated_count,

      preferences:
        result.preferences,
    }
  },
}