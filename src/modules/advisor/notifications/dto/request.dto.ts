import type {

  NotificationType,

  DeliveryChannel,

}
from '../notifications.types.js'

export interface CreateNotificationBodyDto {

  type:
    NotificationType

  title: string

  message: string

  delivery_channel?:
    DeliveryChannel
}

export interface UpdatePreferencesBodyDto {

  update_preference: {

    notification_type:
      NotificationType

    enabled: boolean

    delivery_channel:
      DeliveryChannel

  }[]
}