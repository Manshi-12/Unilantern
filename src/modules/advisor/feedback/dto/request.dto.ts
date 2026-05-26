export interface SubmitFeedbackBodyDto {

  type: string

  message: string

  allow_contact?: boolean

  page_name?: string

  screenshot_url?: string
}