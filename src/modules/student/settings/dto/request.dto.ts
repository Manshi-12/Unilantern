import { FeedbackType } from "../settings.types.js";

export interface SubmitFeedbackRequestDto {
  feedback_type: FeedbackType;
  message: string;
  contact_consent?: boolean;
  screenshot_url?: string;
  page_or_screen?: string;
}
