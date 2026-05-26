import type {

  StudentSummary,
  StudentAcademics,
  StudentExtracurricular,
  StudentEssay,
  StudentHonor,
  StudentService,
  MissedOpportunity,

}
from '../student-detail.types.js'

export interface StudentSummaryResponseDto
  extends StudentSummary {}

export interface StudentAcademicsResponseDto {

  // FIXED
  academics:
    StudentAcademics[]
}

export interface StudentECResponseDto {

  activities:
    StudentExtracurricular[]

  consent_granted:
    boolean
}

export interface StudentEssayResponseDto {

  // FIXED
  essay:
    StudentEssay | null

  consent_granted:
    boolean
}

export interface StudentHonorsResponseDto {

  honors:
    StudentHonor[]
}

export interface StudentServiceResponseDto {

  services:
    StudentService[]
}

export interface MissedOpportunitiesResponseDto {

  opportunities:
    MissedOpportunity[]
}