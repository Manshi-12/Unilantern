import type {

  FlagScholarshipResponseDto,

  FlaggedScholarshipsResponseDto,

}
from './dto/response.dto.js'

import {
  ConflictError,
}
from '../../../shared/errors/app-error.js'

import {
  NotFoundError,
}
from '../../../shared/errors/app-error.js'

import {
  advisorScholarshipsRepository,
}
from './scholarships.repository.js'

export const advisorScholarshipsService = {

  // =====================================
  // API 34
  // =====================================

  getFlaggedScholarships: async (

    studentId: number,

    advisorId: number,

  ): Promise<
    FlaggedScholarshipsResponseDto
  > => {

    const flagged =
      await advisorScholarshipsRepository
        .findFlaggedByStudentAndAdvisor(

          studentId,

          advisorId,
        )

    return {

      student_id:
        studentId,

      flagged,
    }
  },

  // =====================================
  // API 35
  // =====================================

  toggleFlag: async (

    studentId: number,

    advisorId: number,

    scholarshipId: number,

    action:
      'flag' | 'unflag',

    note?: string,

  ): Promise<
    FlagScholarshipResponseDto
  > => {

    // FLAG

    if (action === 'flag') {

      const scholarship =
        await advisorScholarshipsRepository
          .findScholarshipById(
            scholarshipId,
          )

      if (!scholarship) {

        throw new NotFoundError(
          'Scholarship not found',
        )
      }

      const existing =
        await advisorScholarshipsRepository
          .findExistingFlag(

            studentId,

            advisorId,

            scholarshipId,
          )

      if (existing) {

        throw new ConflictError(
          'This scholarship is already flagged for this student',
        )
      }

      const flagId =
        await advisorScholarshipsRepository
          .createFlag({

            advisor_id:
              advisorId,

            student_id:
              studentId,

            scholarship_id:
              scholarshipId,

            note:
              note || null,
          })

      return {

        message:
          'Scholarship flagged successfully.',

        flag_id:
          flagId,

        scholarship_id:
          scholarshipId,

        student_id:
          studentId,
      }
    }

    // UNFLAG

    const deleted =
      await advisorScholarshipsRepository
        .deleteFlag(

          studentId,

          advisorId,

          scholarshipId,
        )

    if (!deleted) {

      throw new NotFoundError(
        'Flagged scholarship not found',
      )
    }

    return {

      message:
        'Scholarship unflagged successfully.',

      flag_id: 0,

      scholarship_id:
        scholarshipId,

      student_id:
        studentId,
    }
  },
}