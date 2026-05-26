import {
  consentRepository,
}
from './consent.repository.js'

import type {
  ConsentType,
}
from './consent.types.js'

import type {
  AllConsentsResponseDto,
  SingleConsentResponseDto,
}
from './dto/response.dto.js'

export const consentService = {

  // =====================================
  // API 20 — Get All Consents
  // =====================================

  getAllConsents: async (
    studentId: number,
  ): Promise<
    AllConsentsResponseDto
  > => {

    const consents =
      await consentRepository
        .findAllByStudentId(
          studentId,
        )

    return {

      student_id:
        studentId,

      consents,
    }
  },

  // =====================================
  // API 21 — Get Single Consent
  // =====================================

  getSingleConsent: async (
    studentId: number,
    consentType: ConsentType,
  ): Promise<
    SingleConsentResponseDto
  > => {

    const consent =
      await consentRepository
        .findByStudentAndType(
          studentId,
          consentType,
        )

    if (!consent) {

      return {

        student_id:
          studentId,

        consent_type:
          consentType,

        status:
          'not_requested',

        granted_at:
          null,

        revoked_at:
          null,
      }
    }

    return {

      student_id:
        studentId,

      consent_type:
        consent.consent_type,

      status:
        consent.status,

      granted_at:
        consent.granted_at,

      revoked_at:
        consent.revoked_at,
    }
  },
}