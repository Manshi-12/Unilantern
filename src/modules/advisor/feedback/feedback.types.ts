export type FeedbackType =
  | 'bug'
  | 'feature_request'
  | 'confusing'
  | 'other'

export type FeedbackStatus =
  | 'new'
  | 'in_review'
  | 'planned'
  | 'resolved'

export interface AdvisorFeedback {

  feedback_id: number

  advisor_id: number

  school_id:
    number | null

  actor_role: string

  type: FeedbackType

  message: string

  allow_contact: boolean

  page_name:
    string | null

  app_version:
    string | null

  device_type:
    string | null

  screenshot_url:
    string | null

  status:
    FeedbackStatus

  created_at: Date
}