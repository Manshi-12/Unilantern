export type ConsentType =
  | 'ec_sharing'
  | 'essay_sharing'
  | 'advisor_visibility'
  | 'school_reporting'
  | 'college_data_share'

export type ConsentStatus =
  | 'granted'
  | 'revoked'
  | 'pending'
  | 'not_requested'

export interface ConsentRecord {

  consent_id: number

  student_id: number

  consent_type: ConsentType

  status: ConsentStatus

  granted_at:
    Date | null

  revoked_at:
    Date | null

  source:
    string | null
}

export interface ConsentRequest {

  request_id: number

  student_id: number

  advisor_id: number

  consent_type: ConsentType

  status:
    | 'pending'
    | 'approved'
    | 'declined'

  requested_at: Date

  responded_at:
    Date | null
}