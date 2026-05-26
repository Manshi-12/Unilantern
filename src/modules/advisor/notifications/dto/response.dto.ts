import type {

  AdvisorNotification,

  NotificationPreference,

}
from '../notifications.types.js'

export interface NotificationsListResponseDto {

  notifications:
    AdvisorNotification[]

  meta: {

    total: number

    unread: number
  }
}

export interface CreateNotificationResponseDto {

  message: string

  notification:
    AdvisorNotification
}

export interface UnreadCountResponseDto {

  unread_count: number
}

export interface MarkReadResponseDto {

  message: string

  notification_id: number
}

export interface MarkAllReadResponseDto {

  message: string

  updated_count: number
}

export interface PreferencesResponseDto {

  preferences:
    NotificationPreference[]
}

export interface UpdateAllPreferencesResponseDto {

  message: string

  updated_count: number

  preferences:
    NotificationPreference[]
}