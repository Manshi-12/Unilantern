import type {
  College,
}
from '../colleges.types.js'

export interface CollegeSearchResponseDto {

  colleges: College[]

  meta: {

    total: number

    page: number

    limit: number

    total_pages: number
  }
}