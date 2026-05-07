export interface ConsentRecordResponseDto {
  consent_type: string;
  status: string;
  is_revocable: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  version: number;
}

export interface ConsentListResponseDto {
  consents: ConsentRecordResponseDto[];
}

export interface CollegeDataSharingResponseDto {
  college_data_sharing_enabled: boolean;
  updated_at: string;
}
