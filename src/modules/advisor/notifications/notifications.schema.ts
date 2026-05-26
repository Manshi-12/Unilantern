import { z }
from 'zod'

export const NotificationIdParamSchema =
  z.object({

    notificationId:
      z.string()
        .regex(
          /^\d+$/,
          'Notification ID must be numeric',
        ),
  })

export const CreateNotificationSchema =
  z.object({

    type:
      z.enum([
        'BAND_CHANGE',
        'NEEDS_ATTENTION',
        'LOW_ENGAGEMENT',
        'COHORT_INSIGHT',
      ]),

    title:
      z.string()

        .min(
          1,
          'Title is required',
        )

        .max(
          255,
          'Title must be under 255 characters',
        ),

    message:
      z.string()

        .min(
          1,
          'Message is required',
        ),

    delivery_channel:
      z.enum([
        'in_app',
        'email',
      ])
      .optional(),
  })

export const UpdatePreferencesSchema =
  z.object({

    update_preference:
      z.array(

        z.object({

          notification_type:
            z.enum([
              'BAND_CHANGE',
              'NEEDS_ATTENTION',
              'LOW_ENGAGEMENT',
              'COHORT_INSIGHT',
            ]),

          enabled:
            z.boolean(),

          delivery_channel:
            z.enum([
              'in_app',
              'email',
            ]),
        }),
      )

      .min(
        1,
        'At least one preference is required',
      ),
  })

export type CreateNotificationInput =
  z.infer<
    typeof CreateNotificationSchema
  >

export type UpdatePreferencesInput =
  z.infer<
    typeof UpdatePreferencesSchema
  >