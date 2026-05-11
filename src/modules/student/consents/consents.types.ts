export enum ConsentType {
  AGE_13PLUS = "age_13plus",
  PARENTAL_13_17 = "parental_13_17",
  ADVISOR_ESSAY = "advisor_essay",
  ADVISOR_EC = "advisor_ec",
  ADVISOR_IMPACT = "advisor_impact",
  ADVISOR_BACKGROUND = "advisor_background",
  SCHOOL = "school",
  COLLEGE = "college",
  FEEDBACK = "feedback",
}

export enum ConsentStatus {
  GRANTED = "granted",
  REVOKED = "revoked",
}

export interface ConsentRecord {
  consent_id: number;
  student_id: number;
  consent_type: string;
  status: ConsentStatus;
  granted_at: Date | null;
  revoked_at: Date | null;
  source: string | null;
  version: number;
  created_at: Date;
}
