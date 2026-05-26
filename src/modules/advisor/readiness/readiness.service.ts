import {
  NotFoundError,
}
from '../../../shared/errors/app-error.js'

import {
  readinessRepository,
}
from './readiness.repository.js'

import type {

  ReadinessCurrentResponseDto,

  ReadinessHistoryResponseDto,

  SchoolDistributionResponseDto,

}
from './dto/response.dto.js'

export const readinessService = {

  // =====================================
  // API 17 — Current Readiness
  // =====================================

  getCurrentReadiness: async (

    studentId: number,

  ): Promise<
    ReadinessCurrentResponseDto
  > => {

    const readiness =
      await readinessRepository
        .findCurrentByStudentId(
          studentId,
        )

    if (!readiness) {

      throw new NotFoundError(
        'Readiness data not found',
      )
    }

    const trendSymbol =

      readiness.trend_direction ===
        'improving'

        ? '↑'

        : readiness.trend_direction ===
            'declining'

          ? '↓'

          : readiness.trend_direction ===
              'stable'

            ? '→'

            : null

    return {

      readiness: {

        student_id:
          readiness.student_id,
      
        readiness_band:
          readiness.readiness_band,
      
        on_track_status:
          readiness.on_track_status,
      
        trend_direction:
          readiness.trend_direction,
      
        primary_limiter:
          readiness.primary_limiter,
      
        // ADD THESE
        academics_band:
          readiness.academics_band,
      
        ec_band:
          readiness.ec_band,
      
        essay_band:
          readiness.essay_band,
      
        awards_band:
          readiness.awards_band,
      
        service_band:
          readiness.service_band,
      
        calculated_at:
          readiness.calculated_at,
      
        categories: [
      
          {
            category:
              'Academics',
      
            band:
              readiness.academics_band,
      
            trend:
              trendSymbol,
          },
      
          {
            category:
              'Extracurriculars',
      
            band:
              readiness.ec_band,
      
            trend:
              trendSymbol,
          },
      
          {
            category:
              'Essay',
      
            band:
              readiness.essay_band,
      
            trend:
              trendSymbol,
          },
      
          {
            category:
              'Honors & Awards',
      
            band:
              readiness.awards_band,
      
            trend:
              trendSymbol,
          },
      
          {
            category:
              'Community Service',
      
            band:
              readiness.service_band,
      
            trend:
              trendSymbol,
          },
        ],
      }
    }
  },

  // =====================================
  // API 18 — Readiness History
  // =====================================

  getReadinessHistory: async (

    studentId: number,

  ): Promise<
    ReadinessHistoryResponseDto
  > => {

    const exists =
      await readinessRepository
        .studentExists(
          studentId,
        )

    if (!exists) {

      throw new NotFoundError(
        'Student not found',
      )
    }

    const history =
      await readinessRepository
        .findHistoryByStudentId(
          studentId,
        )

    return {

      student_id:
        studentId,

      history,
    }
  },

  // =====================================
  // API 19 — School Distribution
  // =====================================

  getSchoolDistribution: async (

    schoolId: number,

    advisorSchoolId: number,

  ): Promise<
    SchoolDistributionResponseDto
  > => {

    if (
      schoolId !== advisorSchoolId
    ) {

      throw new NotFoundError(
        'School not found',
      )
    }

    const rawDistribution =
      await readinessRepository
        .findDistributionBySchoolId(
          schoolId,
        )

    const totalStudents =
      rawDistribution.reduce(

        (
          sum,
          row,
        ) => sum + row.count,

        0,
      )

    const distribution =
      rawDistribution.map(
        (row) => ({

          band:
            row.band,

          count:
            row.count,

          percentage:

            totalStudents > 0

              ? Math.round(
                  (
                    row.count
                    / totalStudents
                  ) * 1000,
                ) / 10

              : 0,
        }),
      )

    return {

      school_id:
        schoolId,

      total_students:
        totalStudents,

      distribution,
    }
  },
}