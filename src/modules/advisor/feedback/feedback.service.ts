import {
  feedbackRepository,
}
from './feedback.repository.js'

import type {
  SubmitFeedbackResponseDto,
}
from './dto/response.dto.js'

import type {
  FeedbackType,
}
from './feedback.types.js'

import type {
  SubmitFeedbackInput,
}
from './feedback.schema.js'

export const feedbackService = {

  // =====================================
  // API 62 — Submit Feedback
  // =====================================

  submitFeedback: async (

    advisorId: number,

    schoolId:
      number | null,

    advisorRole: string,

    body:
      SubmitFeedbackInput,

    appVersion:
      string | null,

    deviceType:
      string | null,

  ): Promise<
    SubmitFeedbackResponseDto
  > => {

    const feedback =
      await feedbackRepository
        .createFeedback({

          advisor_id:
            advisorId,

          school_id:
            schoolId,

          actor_role:
            advisorRole,

          type:
            body.type as FeedbackType,

          message:
            body.message,

          allow_contact:
            body.allow_contact
              ?? false,

          page_name:
            body.page_name
              || null,

          app_version:
            appVersion,

          device_type:
            deviceType,

          screenshot_url:
            body.screenshot_url
              || null,
        })

    return {

      message:
        'Thank you for your feedback. We have received your submission.',

      feedback_id:
        feedback.feedback_id,
    }
  },
}