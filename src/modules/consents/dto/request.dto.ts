import { ConsentType } from "../consents.types.js";

export interface GrantConsentRequestDto {
  consent_type: ConsentType;
}

export interface RevokeConsentRequestDto {
  consent_type: ConsentType;
}

export interface UpdateCollegeDataSharingRequestDto {
  enabled: boolean;
}
