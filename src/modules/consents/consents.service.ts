import { ConsentsRepository } from "./consents.repository.js";
import { ConsentType, ConsentStatus, type ConsentRecord } from "./consents.types.js";
import { AuthError } from "../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../shared/response/error-codes.js";
import type { 
  ConsentRecordResponseDto, 
  ConsentListResponseDto,
  CollegeDataSharingResponseDto
} from "./dto/response.dto.js";

export class ConsentsService {
  constructor(private readonly consentsRepository: ConsentsRepository) {}

  async getAllConsents(userId: number): Promise<ConsentListResponseDto> {
    const consents = await this.consentsRepository.findAllByUserId(userId);
    
    // Map all supported types, ensuring defaults if not set in DB
    const supportedTypes = Object.values(ConsentType);
    const responseConsents: ConsentRecordResponseDto[] = supportedTypes.map(type => {
      const record = consents.find(c => c.consent_type === type);
      
      // Default 'college' to granted if not present, others to revoked/null
      const status = record?.status || (type === ConsentType.COLLEGE ? ConsentStatus.GRANTED : ConsentStatus.REVOKED);
      
      return {
        consent_type: type,
        status: status,
        is_revocable: type !== ConsentType.AGE_13PLUS,
        granted_at: record?.granted_at?.toISOString() || (type === ConsentType.COLLEGE && !record ? new Date().toISOString() : null),
        revoked_at: record?.revoked_at?.toISOString() || null,
        version: record?.version || 1,
      };
    });

    return { consents: responseConsents };
  }

  async grantConsent(userId: number, consentType: ConsentType): Promise<ConsentRecordResponseDto> {
    const existing = await this.consentsRepository.findByUserIdAndType(userId, consentType);
    if (existing && existing.status === ConsentStatus.GRANTED) {
      throw new AuthError(AuthErrorCode.ALREADY_GRANTED, "Consent already in granted state", 409);
    }

    const record = await this.consentsRepository.upsertConsent(userId, consentType, ConsentStatus.GRANTED);
    
    return {
      consent_type: record.consent_type,
      status: record.status,
      is_revocable: record.consent_type !== ConsentType.AGE_13PLUS,
      granted_at: record.granted_at?.toISOString() || null,
      revoked_at: record.revoked_at?.toISOString() || null,
      version: record.version,
    };
  }

  async revokeConsent(userId: number, consentType: ConsentType): Promise<ConsentRecordResponseDto> {
    if (consentType === ConsentType.AGE_13PLUS) {
      throw new AuthError(AuthErrorCode.CONSENT_NOT_REVOCABLE, "age_13plus cannot be revoked", 400);
    }

    const existing = await this.consentsRepository.findByUserIdAndType(userId, consentType);
    if (existing && existing.status === ConsentStatus.REVOKED) {
      throw new AuthError(AuthErrorCode.ALREADY_REVOKED, "Consent already revoked", 400);
    }

    const record = await this.consentsRepository.upsertConsent(userId, consentType, ConsentStatus.REVOKED);
    
    return {
      consent_type: record.consent_type,
      status: record.status,
      is_revocable: true,
      granted_at: record.granted_at?.toISOString() || null,
      revoked_at: record.revoked_at?.toISOString() || null,
      version: record.version,
    };
  }

  async getCollegeDataSharing(userId: number): Promise<CollegeDataSharingResponseDto> {
    const record = await this.consentsRepository.findByUserIdAndType(userId, ConsentType.COLLEGE);
    
    // Default is true (opted in)
    const enabled = record ? record.status === ConsentStatus.GRANTED : true;
    const updatedAt = record ? (record.revoked_at || record.granted_at || record.created_at) : new Date();

    return {
      college_data_sharing_enabled: enabled,
      updated_at: updatedAt.toISOString(),
    };
  }

  async updateCollegeDataSharing(userId: number, enabled: boolean): Promise<CollegeDataSharingResponseDto> {
    const status = enabled ? ConsentStatus.GRANTED : ConsentStatus.REVOKED;
    const record = await this.consentsRepository.upsertConsent(userId, ConsentType.COLLEGE, status);
    
    return {
      college_data_sharing_enabled: record.status === ConsentStatus.GRANTED,
      updated_at: (record.revoked_at || record.granted_at || record.created_at).toISOString(),
    };
  }
}
