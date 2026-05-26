import type {

  ReadinessCurrent,

  ReadinessSnapshot,

  SchoolBandDistribution,

  CategoryBand,

}
from '../readiness.types.js'

export interface ReadinessCurrentResponseDto {

  readiness:

    ReadinessCurrent & {

      categories:
        CategoryBand[]
    }
}

export interface ReadinessHistoryResponseDto {

  student_id: number

  history:
    ReadinessSnapshot[]
}

export interface SchoolDistributionResponseDto {

  school_id: number

  total_students: number

  distribution:
    SchoolBandDistribution[]
}