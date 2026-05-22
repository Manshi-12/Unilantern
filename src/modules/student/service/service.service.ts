import { ConflictError } from "../../../shared/errors/conflict-error.js";
import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type { CreateServiceRequestDto, UpdateServiceRequestDto } from "./dto/request.dto.js";
import type {
  ServiceCreateResponseDto,
  ServiceDeleteResponseDto,
  ServiceEntryResponseDto,
  ServiceListResponseDto,
  ServiceUpdateResponseDto,
} from "./dto/response.dto.js";
import type { ServiceRepository } from "./service.repository.js";
import type { ServiceEntryRecord } from "./service.types.js";
import { queueScoreRecalculation } from "../scoring/scoring.orchestrator.js";

export class ServiceService {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async list(studentId: number): Promise<ServiceListResponseDto> {
    const entries = await this.serviceRepo.listByStudentId(studentId);
    return { data: entries.map((entry) => this.mapEntry(entry)) };
  }

  async create(studentId: number, dto: CreateServiceRequestDto): Promise<ServiceCreateResponseDto> {
    const count = await this.serviceRepo.countByStudentId(studentId);
    if (count >= 3) {
      throw new ConflictError("LIMIT_REACHED", "Maximum 3 service entries per student");
    }

    const entry = await this.serviceRepo.create({
      student_id: studentId,
      total_hours_range: dto.total_hours_range,
      action_type: dto.action_type,
      is_leadership: dto.is_leadership ?? false,
      duration_months: dto.duration_months,
    });

    return {
      service_id: entry.service_id,
      score_recalc_queued: await this.enqueueScoreRecalc(studentId),
      created_at: entry.created_at.toISOString(),
    };
  }

  async update(studentId: number, serviceId: number, dto: UpdateServiceRequestDto): Promise<ServiceUpdateResponseDto> {
    const updated = await this.serviceRepo.update(serviceId, studentId, dto);
    if (updated === 0) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Community service entry not found", 404);
    }

    return {
      updated: true,
      score_recalc_queued: await this.enqueueScoreRecalc(studentId),
    };
  }

  async delete(studentId: number, serviceId: number): Promise<ServiceDeleteResponseDto> {
    const deleted = await this.serviceRepo.delete(serviceId, studentId);
    if (deleted === 0) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Community service entry not found", 404);
    }

    return {
      deleted: true,
      score_recalc_queued: await this.enqueueScoreRecalc(studentId),
    };
  }

  private mapEntry(entry: ServiceEntryRecord): ServiceEntryResponseDto {
    return {
      service_id: entry.service_id,
      total_hours_range: entry.total_hours_range,
      action_type: entry.action_type,
      is_leadership: entry.is_leadership,
      duration_months: entry.duration_months,
      display_order: entry.display_order,
      updated_at: entry.updated_at.toISOString(),
    };
  }

  private async enqueueScoreRecalc(studentId: number): Promise<boolean> {
    console.log(`[service] queued readiness recalculation for student_id=${studentId}`);
    return queueScoreRecalculation(studentId, "service");
  }
}
