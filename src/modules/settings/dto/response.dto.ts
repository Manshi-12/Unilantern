export interface FeedbackSubmittedResponseDto {
  feedback_id: number;
  confirmation_message: string;
  created_at: string;
}

export interface DeleteAccountResponseDto {
  deleted: boolean;
  message: string;
}
