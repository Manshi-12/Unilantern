import type {
  ConsentRecord,
}
from '../consent.types.js'

export interface AllConsentsResponseDto {

  student_id: number

  consents:
    ConsentRecord[]
}

export interface SingleConsentResponseDto {

  student_id: number

  consent_type: string

  status: string

  granted_at:
    Date | null

  revoked_at:
    Date | null
}