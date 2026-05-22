import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type {
  ExtracurricularCreateDto,
  ExtracurricularUpdateDto,
  ExtracurricularReorderDto,
} from "./dto/request.dto.js";
import type {
  ExtracurricularListResponseDto,
  ExtracurricularResponseDto,
  ExtracurricularCreateResponseDto,
  ExtracurricularUpdateResponseDto,
  ExtracurricularReorderResponseDto,
} from "./dto/response.dto.js";
import type { ExtracurricularsRepository } from "./extracurriculars.repository.js";
import type { ScoresRepository } from "../academics/scores.repository.js";
import { queueScoreRecalculation } from "../scoring/scoring.orchestrator.js";
import type {
  ExtracurricularRecord,
  CreateExtracurricularData,
  UpdateExtracurricularData,
  ExtracurricularReorderData,
} from "./extracurriculars.types.js";

export class ExtracurricularsService {
  constructor(
    private readonly extracurricularsRepo: ExtracurricularsRepository,
    private readonly scoresRepo: ScoresRepository,
  ) {}

  async getExtracurriculars(
    studentId: number,
    limit: number,
    cursor?: string
  ): Promise<ExtracurricularListResponseDto> {
    const { activities, hasMore, nextCursor } = await this.extracurricularsRepo.getExtracurricularsByStudentId(
      studentId,
      limit,
      cursor
    );

    return {
      activities: activities.map(activity => this.mapExtracurricular(activity)),
      has_more: hasMore,
      next_cursor: nextCursor,
    };
  }

  async getExtracurricular(activityId: number, studentId: number): Promise<ExtracurricularResponseDto> {
    const isOwner = await this.extracurricularsRepo.validateExtracurricularOwnership(activityId, studentId);
    if (!isOwner) {
      throw new AuthError(AuthErrorCode.FORBIDDEN, "Access denied", 403);
    }

    const activity = await this.extracurricularsRepo.getExtracurricularById(activityId);
    if (!activity) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Extracurricular activity not found", 404);
    }

    return this.mapExtracurricular(activity);
  }

  async createExtracurricular(
    studentId: number,
    dto: ExtracurricularCreateDto
  ): Promise<ExtracurricularCreateResponseDto> {
    const data: CreateExtracurricularData = {
      student_id: studentId,
      activity_name: dto.activity_name,
      activity_type: dto.activity_type,
      years_involved: dto.years_involved,
      involvement_level: dto.involvement_level,
      activity_description: dto.activity_description,
      impact_text: dto.impact_text,
      impact_level: dto.impact_level,
      hours_per_week: dto.hours_per_week,
      experience_duration_weeks: dto.experience_duration_weeks,
      selective_acceptance_toggle: dto.selective_acceptance_toggle,
      external_org_toggle: dto.external_org_toggle,
      travel_or_residency_toggle: dto.travel_or_residency_toggle,
      people_impacted: dto.people_impacted,
      funds_raised: dto.funds_raised,
      users_acquired: dto.users_acquired,
      hours_delivered: dto.hours_delivered,
      competition_top_10_pct_toggle: dto.competition_top_10_pct_toggle,
      finalist_or_winner_toggle: dto.finalist_or_winner_toggle,
      publication_or_presented_toggle: dto.publication_or_presented_toggle,
      policy_or_partnership_toggle: dto.policy_or_partnership_toggle,
      structured_deliverable_toggle: dto.structured_deliverable_toggle,
      language_or_skill_cert_toggle: dto.language_or_skill_cert_toggle,
      formal_selection_toggle: dto.formal_selection_toggle,
      documented_real_world_output_toggle: dto.documented_real_world_output_toggle,
    };

    const activity = await this.extracurricularsRepo.createExtracurricular(data);
    const scoreQueued = this.enqueueScoreRecalc(studentId, false);

    return {
      activity_id: String(activity.activity_id),
      display_order: activity.display_order,
      score_recalc_queued: scoreQueued,
      created_at: activity.created_at.toISOString(),
    };
  }

  async updateExtracurricular(
    activityId: number,
    studentId: number,
    dto: ExtracurricularUpdateDto
  ): Promise<ExtracurricularUpdateResponseDto> {
    const isOwner = await this.extracurricularsRepo.validateExtracurricularOwnership(activityId, studentId);
    if (!isOwner) {
      throw new AuthError(AuthErrorCode.FORBIDDEN, "Access denied", 403);
    }

    const data: UpdateExtracurricularData = {};
    const updatedFields: string[] = [];

    if (dto.activity_name !== undefined) {
      data.activity_name = dto.activity_name;
      updatedFields.push("activity_name");
    }
    if (dto.activity_type !== undefined) {
      data.activity_type = dto.activity_type;
      updatedFields.push("activity_type");
    }
    if (dto.years_involved !== undefined) {
      data.years_involved = dto.years_involved;
      updatedFields.push("years_involved");
    }
    if (dto.involvement_level !== undefined) {
      data.involvement_level = dto.involvement_level;
      updatedFields.push("involvement_level");
    }
    if (dto.activity_description !== undefined) {
      data.activity_description = dto.activity_description;
      updatedFields.push("activity_description");
    }
    if (dto.impact_text !== undefined) {
      data.impact_text = dto.impact_text;
      updatedFields.push("impact_text");
    }
    if (dto.impact_level !== undefined) {
      data.impact_level = dto.impact_level;
      updatedFields.push("impact_level");
    }
    if (dto.hours_per_week !== undefined) {
      data.hours_per_week = dto.hours_per_week;
      updatedFields.push("hours_per_week");
    }
    if (dto.experience_duration_weeks !== undefined) {
      data.experience_duration_weeks = dto.experience_duration_weeks;
      updatedFields.push("experience_duration_weeks");
    }
    if (dto.selective_acceptance_toggle !== undefined) {
      data.selective_acceptance_toggle = dto.selective_acceptance_toggle;
      updatedFields.push("selective_acceptance_toggle");
    }
    if (dto.external_org_toggle !== undefined) {
      data.external_org_toggle = dto.external_org_toggle;
      updatedFields.push("external_org_toggle");
    }
    if (dto.travel_or_residency_toggle !== undefined) {
      data.travel_or_residency_toggle = dto.travel_or_residency_toggle;
      updatedFields.push("travel_or_residency_toggle");
    }
    if (dto.people_impacted !== undefined) {
      data.people_impacted = dto.people_impacted;
      updatedFields.push("people_impacted");
    }
    if (dto.funds_raised !== undefined) {
      data.funds_raised = dto.funds_raised;
      updatedFields.push("funds_raised");
    }
    if (dto.users_acquired !== undefined) {
      data.users_acquired = dto.users_acquired;
      updatedFields.push("users_acquired");
    }
    if (dto.hours_delivered !== undefined) {
      data.hours_delivered = dto.hours_delivered;
      updatedFields.push("hours_delivered");
    }
    if (dto.competition_top_10_pct_toggle !== undefined) {
      data.competition_top_10_pct_toggle = dto.competition_top_10_pct_toggle;
      updatedFields.push("competition_top_10_pct_toggle");
    }
    if (dto.finalist_or_winner_toggle !== undefined) {
      data.finalist_or_winner_toggle = dto.finalist_or_winner_toggle;
      updatedFields.push("finalist_or_winner_toggle");
    }
    if (dto.publication_or_presented_toggle !== undefined) {
      data.publication_or_presented_toggle = dto.publication_or_presented_toggle;
      updatedFields.push("publication_or_presented_toggle");
    }
    if (dto.policy_or_partnership_toggle !== undefined) {
      data.policy_or_partnership_toggle = dto.policy_or_partnership_toggle;
      updatedFields.push("policy_or_partnership_toggle");
    }
    if (dto.structured_deliverable_toggle !== undefined) {
      data.structured_deliverable_toggle = dto.structured_deliverable_toggle;
      updatedFields.push("structured_deliverable_toggle");
    }
    if (dto.language_or_skill_cert_toggle !== undefined) {
      data.language_or_skill_cert_toggle = dto.language_or_skill_cert_toggle;
      updatedFields.push("language_or_skill_cert_toggle");
    }
    if (dto.formal_selection_toggle !== undefined) {
      data.formal_selection_toggle = dto.formal_selection_toggle;
      updatedFields.push("formal_selection_toggle");
    }
    if (dto.documented_real_world_output_toggle !== undefined) {
      data.documented_real_world_output_toggle = dto.documented_real_world_output_toggle;
      updatedFields.push("documented_real_world_output_toggle");
    }

    if (updatedFields.length === 0) {
      throw new AuthError(AuthErrorCode.VALIDATION_ERROR, "No changes detected", 400);
    }

    await this.extracurricularsRepo.updateExtracurricular(activityId, data);
    const scoreQueued = this.enqueueScoreRecalc(studentId, false);

    const activity = await this.extracurricularsRepo.getExtracurricularById(activityId);
    if (!activity) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Extracurricular activity not found after update", 500);
    }

    return {
      activity_id: String(activityId),
      updated_fields: updatedFields,
      score_recalc_queued: scoreQueued,
      updated_at: activity.updated_at.toISOString(),
    };
  }

  async deleteExtracurricular(activityId: number, studentId: number): Promise<void> {
    const isOwner = await this.extracurricularsRepo.validateExtracurricularOwnership(activityId, studentId);
    if (!isOwner) {
      throw new AuthError(AuthErrorCode.FORBIDDEN, "Access denied", 403);
    }

    await this.extracurricularsRepo.deleteExtracurricular(activityId);
    this.enqueueScoreRecalc(studentId, false);
  }

  async reorderExtracurriculars(
    studentId: number,
    dto: ExtracurricularReorderDto
  ): Promise<ExtracurricularReorderResponseDto> {
    const orders: ExtracurricularReorderData[] = dto.order.map((row) => ({
      activity_id: row.ec_id,
      display_order: row.display_order,
    }));

    // Validate all activities belong to the student
    for (const order of orders) {
      const isOwner = await this.extracurricularsRepo.validateExtracurricularOwnership(order.activity_id, studentId);
      if (!isOwner) {
        throw new AuthError(AuthErrorCode.FORBIDDEN, "Access denied", 403);
      }
    }

    const updatedCount = await this.extracurricularsRepo.reorderExtracurriculars(studentId, orders);

    return {
      updated_count: updatedCount,
      score_recalc_queued: false,
    };
  }

  private mapExtracurricular(activity: ExtracurricularRecord): ExtracurricularResponseDto {
    return {
      activity_id: String(activity.activity_id),
      activity_name: activity.activity_name,
      activity_type: activity.activity_type,
      years_involved: activity.years_involved,
      involvement_level: activity.involvement_level,
      activity_description: activity.activity_description,
      impact_text: activity.impact_text,
      impact_level: activity.impact_level,
      display_order: activity.display_order,
      created_at: activity.created_at.toISOString(),
      updated_at: activity.updated_at.toISOString(),
    };
  }

  private enqueueScoreRecalc(studentId: number, gradeChanged: boolean): boolean {
    console.log(
      `[extracurriculars] queued readiness recalculation for student_id=${studentId} grade_changed=${gradeChanged}`,
    );
    queueScoreRecalculation(studentId, "extracurriculars");
    return true;
  }
}
