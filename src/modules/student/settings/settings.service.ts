import { SettingsRepository } from "./settings.repository.js";
import type { SubmitFeedbackRequestDto } from "./dto/request.dto.js";
import type { FeedbackSubmittedResponseDto } from "./dto/response.dto.js";

export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async submitFeedback(
    userId: number,
    schoolId: number | null,
    role: string,
    data: SubmitFeedbackRequestDto,
    metadata: {
      platform?: string;
      app_version?: string;
      device_type?: string;
    }
  ): Promise<FeedbackSubmittedResponseDto> {
    const record = await this.settingsRepository.createFeedback({
      user_id: userId,
      school_id: schoolId,
      user_role: role,
      feedback_type: data.feedback_type,
      message: data.message,
      contact_consent: data.contact_consent ?? false,
      screenshot_url: data.screenshot_url,
      page_or_screen: data.page_or_screen,
      platform: metadata.platform,
      app_version: metadata.app_version,
      device_type: metadata.device_type,
    });

    return {
      feedback_id: record.feedback_id,
      confirmation_message: "Thank you for your feedback! We've received it and will review it soon.",
      created_at: record.created_at.toISOString(),
    };
  }

}
