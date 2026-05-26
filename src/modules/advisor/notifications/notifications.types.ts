export type NotificationType =

  | 'BAND_CHANGE'

  | 'NEEDS_ATTENTION'

  | 'LOW_ENGAGEMENT'

  | 'COHORT_INSIGHT'

export type DeliveryChannel =

  | 'in_app'

  | 'email'

export interface AdvisorNotification {

  notification_id: number

  advisor_id: number

  type:
    NotificationType

  title: string

  message: string

  delivery_channel:
    DeliveryChannel

  is_read: boolean

  created_at: Date
}

export interface NotificationPreference {

  preference_id: number

  advisor_id: number

  notification_type:
    NotificationType

  enabled: boolean

  delivery_channel:
    DeliveryChannel

  updated_at: Date
}