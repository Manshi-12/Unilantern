import { AppError } from "../../shared/errors/app-error.js";
import type { AnalyticsEventBatchRequestDto, AnalyticsEventDto, AnalyticsTabName } from "./dto/request.dto.js";
import type { AnalyticsBatchResponseDto } from "./dto/response.dto.js";
import type { AnalyticsRepository } from "./analytics.repository.js";
import type { AnalyticsEventRecord } from "./analytics.types.js";

const allowedTabs = new Set<AnalyticsTabName>(["Profile", "Search", "Saved", "Improve", "Financial"]);
const sensitivePropertyKeys = [
  "essay_text",
  "essay",
  "total_score",
  "score",
  "scores",
  "gpa",
  "sat_score",
  "act_score",
  "email",
  "phone",
  "phone_number",
  "date_of_birth",
  "dob",
  "full_name",
  "name",
];

export class AnalyticsService {
  constructor(private readonly analyticsRepo: AnalyticsRepository) {}

  async trackEvents(
    studentId: number,
    schoolId: number | null,
    dto: AnalyticsEventBatchRequestDto,
  ): Promise<AnalyticsBatchResponseDto> {
    if (dto.events.length > 50) {
      throw new AppError("BATCH_TOO_LARGE", "events array exceeds 50 items", 400);
    }

    const gradeLevel = await this.analyticsRepo.getStudentGrade(studentId);
    const acceptedEvents: AnalyticsEventRecord[] = [];
    const rejectedReasons: string[] = [];

    dto.events.forEach((event, index) => {
      const reason = this.validateEvent(event);
      if (reason) {
        rejectedReasons.push(`events[${index}]: ${reason}`);
        return;
      }

      acceptedEvents.push({
        actor_id: studentId,
        actor_role: "student",
        school_id: schoolId,
        event_name: event.event_name,
        tab_name: event.tab_name ?? null,
        grade_level: gradeLevel,
        platform: event.platform,
        session_id: event.session_id ?? null,
        properties: {
          ...(event.properties ?? {}),
          client_timestamp: event.timestamp,
        },
      });
    });

    const accepted = await this.analyticsRepo.insertEvents(acceptedEvents);

    return {
      accepted,
      rejected: dto.events.length - accepted,
      rejected_reasons: rejectedReasons,
    };
  }

  private validateEvent(event: AnalyticsEventDto): string | null {
    if (event.tab_name && !allowedTabs.has(event.tab_name)) {
      return "INVALID_TAB_NAME";
    }
    if (event.event_name === "bottom_tab_click" && !event.tab_name) {
      return "tab_name is required for bottom_tab_click";
    }
    if (this.containsSensitiveProperties(event.properties ?? {})) {
      return "properties must not contain essay text, score data, grades, or PII";
    }
    return null;
  }

  private containsSensitiveProperties(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;

    if (Array.isArray(value)) {
      return value.some((item) => this.containsSensitiveProperties(item));
    }

    return Object.entries(value as Record<string, unknown>).some(([key, child]) => {
      const normalized = key.toLowerCase();
      return sensitivePropertyKeys.some((blocked) => normalized.includes(blocked))
        || this.containsSensitiveProperties(child);
    });
  }
}
