import {
  getPool,
  sql,
}
from '../../../db/client.js'

import type {

  AdvisorNotification,

  NotificationPreference,

  NotificationType,

  DeliveryChannel,

}
from './notifications.types.js'

export const notificationsRepository = {

  // =====================================
  // API 47 — Get Notifications
  // =====================================

  findAllByAdvisor: async (

    advisorId: number,

  ): Promise<
    AdvisorNotification[]
  > => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          SELECT

            notification_id,
            advisor_id,
            type,
            title,
            message,
            delivery_channel,
            is_read,
            created_at

          FROM advisor_notifications

          WHERE advisor_id =
            @advisorId

          ORDER BY
            created_at DESC
        `)

    return result.recordset
  },

  // =====================================
  // API 48 — Get Unread Count
  // =====================================

  getUnreadCount: async (

    advisorId: number,

  ): Promise<number> => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          SELECT

            COUNT(*) AS unread_count

          FROM advisor_notifications

          WHERE advisor_id =
            @advisorId

            AND is_read = 0
        `)

    return result.recordset[0]
      .unread_count
  },

  // =====================================
  // API 49 — Create Notification
  // =====================================

  createNotification: async (

    data: {

      advisor_id: number

      type: NotificationType

      title: string

      message: string

      delivery_channel:
        DeliveryChannel
    },

  ): Promise<
    AdvisorNotification
  > => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'advisorId',
          sql.Int,
          data.advisor_id,
        )

        .input(
          'type',
          sql.VarChar(50),
          data.type,
        )

        .input(
          'title',
          sql.NVarChar(255),
          data.title,
        )

        .input(
          'message',
          sql.NVarChar(sql.MAX),
          data.message,
        )

        .input(
          'deliveryChannel',
          sql.VarChar(20),
          data.delivery_channel,
        )

        .query(`
          INSERT INTO advisor_notifications (

            advisor_id,
            type,
            title,
            message,
            delivery_channel

          )

          OUTPUT INSERTED.*

          VALUES (

            @advisorId,
            @type,
            @title,
            @message,
            @deliveryChannel
          )
        `)

    return result.recordset[0]
  },

  // =====================================
  // API 50 — Mark As Read
  // =====================================

  markAsRead: async (

    notificationId: number,

    advisorId: number,

  ): Promise<boolean> => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'notificationId',
          sql.Int,
          notificationId,
        )

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          UPDATE advisor_notifications

          SET
            is_read = 1

          WHERE notification_id =
            @notificationId

            AND advisor_id =
              @advisorId
        `)

    return (
      result.rowsAffected[0] > 0
    )
  },

  // =====================================
  // API 51 — Mark All As Read
  // =====================================

  markAllAsRead: async (

    advisorId: number,

  ): Promise<number> => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          UPDATE advisor_notifications

          SET
            is_read = 1

          WHERE advisor_id =
            @advisorId

            AND is_read = 0
        `)

    return result.rowsAffected[0]
  },

  // =====================================
  // API 52 — Get Preferences
  // =====================================

  getPreferences: async (

    advisorId: number,

  ): Promise<
    NotificationPreference[]
  > => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .query(`
          SELECT *

          FROM advisor_notification_preferences

          WHERE advisor_id =
            @advisorId
        `)

    return result.recordset
  },

  // =====================================
  // API 53 + 54 — Update Preferences
  // =====================================

  updatePreferences: async (

    advisorId: number,

    preferences: {

      notification_type:
        NotificationType

      enabled: boolean

      delivery_channel:
        DeliveryChannel

    }[],

  ): Promise<{

    updated_count: number

    preferences:
      NotificationPreference[]
  }> => {

    const pool =
      await getPool()

    let updated_count = 0

    for (
      const pref of preferences
    ) {

      const result =
        await pool

          .request()

          .input(
            'advisorId',
            sql.Int,
            advisorId,
          )

          .input(
            'notificationType',
            sql.VarChar(50),
            pref.notification_type,
          )

          .input(
            'enabled',
            sql.Bit,
            pref.enabled,
          )

          .input(
            'deliveryChannel',
            sql.VarChar(20),
            pref.delivery_channel,
          )

          .query(`
            UPDATE
              advisor_notification_preferences

            SET

              enabled =
                @enabled,

              delivery_channel =
                @deliveryChannel,

              updated_at =
                GETDATE()

            WHERE advisor_id =
              @advisorId

              AND notification_type =
                @notificationType
          `)

      updated_count +=
        result.rowsAffected[0]
    }

    const updatedPreferences =
      await notificationsRepository
        .getPreferences(
          advisorId,
        )

    return {

      updated_count,

      preferences:
        updatedPreferences,
    }
  },

  // =====================================
  // Check Preference Enabled
  // =====================================

  isNotificationEnabled: async (

    advisorId: number,

    type: NotificationType,

  ): Promise<boolean> => {

    const pool =
      await getPool()

    const result =
      await pool

        .request()

        .input(
          'advisorId',
          sql.Int,
          advisorId,
        )

        .input(
          'type',
          sql.VarChar(50),
          type,
        )

        .query(`
          SELECT enabled

          FROM advisor_notification_preferences

          WHERE advisor_id =
            @advisorId

            AND notification_type =
              @type
        `)

    if (
      result.recordset.length === 0
    ) {

      return true
    }

    return result.recordset[0]
      .enabled
  },
}