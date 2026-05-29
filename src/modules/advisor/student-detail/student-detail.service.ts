import {
  NotFoundError,
}
from '../../../shared/errors/app-error.js'

import {
  studentDetailRepository,
}
from './student-detail.repository.js'

import type {

  StudentSummaryResponseDto,

  StudentAcademicsResponseDto,

  StudentECResponseDto,

  StudentEssayResponseDto,

  StudentHonorsResponseDto,

  StudentServiceResponseDto,

  MissedOpportunitiesResponseDto,

}
from './dto/response.dto.js'

import type {
  MissedOpportunity,
}
from './student-detail.types.js'

export const studentDetailService = {

  // =====================================
  // API 10 — Student Summary
  // =====================================

  getStudentSummary: async (

    studentId: number,

    schoolId: number,

  ): Promise<
    StudentSummaryResponseDto
  > => {

    const student =
      await studentDetailRepository
        .findStudentById(

          studentId,

          schoolId,
        )

    if (!student) {

      throw new NotFoundError(
        'Student not found',
      )
    }

    return student
  },

  // =====================================
  // API 11 — Academics
  // =====================================

  getAcademics: async (

    studentId: number,

  ): Promise<
    StudentAcademicsResponseDto
  > => {

    const academics =
      await studentDetailRepository
        .findAcademics(
          studentId,
        )

    return {
      academics,
    }
  },

  // =====================================
  // API 12 — Extracurriculars
  // =====================================

  getExtracurriculars: async (

    studentId: number,

  ): Promise<
    StudentECResponseDto
  > => {

    const activities =
      await studentDetailRepository
        .findExtracurriculars(
          studentId,
        )

    const consent =
      await studentDetailRepository
        .getConsentStatus(
          studentId,
        )

    return {

      activities:
        consent.ec_sharing
          ? activities
          : [],

      consent_granted:
        consent.ec_sharing,
    }
  },

  // =====================================
  // API 13 — Essay
  // =====================================

  getEssay: async (

    studentId: number,

  ): Promise<
    StudentEssayResponseDto
  > => {

    const essay =
      await studentDetailRepository
        .findEssay(
          studentId,
        )

    const consent =
      await studentDetailRepository
        .getConsentStatus(
          studentId,
        )

    return {

      essay:
        consent.essay_sharing
          ? essay
          : null,

      consent_granted:
        consent.essay_sharing,
    }
  },

  // =====================================
  // API 14 — Honors
  // =====================================

  getHonors: async (

    studentId: number,

  ): Promise<
    StudentHonorsResponseDto
  > => {

    const honors =
      await studentDetailRepository
        .findHonors(
          studentId,
        )

    return {
      honors,
    }
  },

  // =====================================
  // API 15 — Community Service
  // =====================================

  getCommunityService: async (

    studentId: number,

  ): Promise<
    StudentServiceResponseDto
  > => {

    const services =
      await studentDetailRepository
        .findServices(
          studentId,
        )

    return {
      services,
    }
  },

  // =====================================
  // API 16 — Missed Opportunities
  // =====================================

  getMissedOpportunities: async (

    studentId: number,

    schoolId: number,

  ): Promise<
    MissedOpportunitiesResponseDto
  > => {

    const student =
      await studentDetailRepository
        .findStudentById(

          studentId,

          schoolId,
        )

    if (!student) {

      throw new NotFoundError(
        'Student not found',
      )
    }

    const opportunities:
      MissedOpportunity[] = []

    // =====================================
    // Weak EC vs Strong Academics
    // =====================================

    if (

      (
        student.academics_band ===
          'strongly_competitive'

        ||

        student.academics_band ===
          'exceptional'
      )

      &&

      (
        student.ec_band ===
          'foundational'

        ||

        student.ec_band ===
          'developing'
      )
    ) {

      opportunities.push({

        category:
          'Extracurriculars',

        message:
          'Strong academics but weak extracurricular profile.',

        priority:
          'high',
      })
    }

    // =====================================
    // Small College List
    // =====================================

    if (

      (
        student.readiness_band ===
          'competitive'

        ||

        student.readiness_band ===
          'strongly_competitive'
      )

      &&

      student.saved_colleges <= 2
    ) {

      opportunities.push({

        category:
          'College List',

        message:
          'Student should explore more colleges.',

        priority:
          'medium',
      })
    }

    // =====================================
    // Engagement Check
    // =====================================

   // =====================================
// Engagement Check
// =====================================

if (!student.last_login_at) {

  opportunities.push({

    category:
      'Engagement',

    message:
      'Student has never logged in.',

    priority:
      'high',
  })

} else {

  const cutoff =
    new Date()

  cutoff.setDate(
    cutoff.getDate() - 14,
  )

  if (
    new Date(student.last_login_at)
      < cutoff
  ) {

    opportunities.push({

      category:
        'Engagement',

      message:
        'Student inactive for more than 14 days.',

      priority:
        'medium',
    })
  }
}

    // =====================================
    // No Issues
    // =====================================

    if (
      opportunities.length === 0
    ) {

      opportunities.push({

        category:
          'General',

        message:
          'No major missed opportunities detected.',

        priority:
          'low',
      })
    }

    return {
      opportunities,
    }
  },
}