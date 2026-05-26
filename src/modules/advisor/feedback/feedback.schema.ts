import { z }
from 'zod'

export const SubmitFeedbackSchema =
  z.object({

    type:
      z.enum([
        'bug',
        'feature_request',
        'confusing',
        'other',
      ]),

    message:
      z.string()

        .min(
          1,
          'Message is required',
        )

        .max(
          5000,
          'Message must be under 5000 characters',
        ),

    allow_contact:
      z.boolean()
        .optional(),

    page_name:
      z.string()
        .max(255)
        .optional(),

    screenshot_url:
      z.string()
        .url(
          'Invalid screenshot URL',
        )
        .optional(),
  })

export type SubmitFeedbackInput =
  z.infer<
    typeof SubmitFeedbackSchema
  >