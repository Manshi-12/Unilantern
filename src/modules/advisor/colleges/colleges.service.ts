import {
  collegesRepository,
}
from './colleges.repository.js'

import type {
  CollegeSearchInput,
}
from './colleges.schema.js'

import type {
  CollegeSearchResponseDto,
}
from './dto/response.dto.js'

export const collegesService = {

  searchColleges: async (
    query: CollegeSearchInput,
  ): Promise<
    CollegeSearchResponseDto
  > => {

    const page =
      parseInt(
        query.page || '1',
      )

    const limit =
      parseInt(
        query.limit || '20',
      )

    const {
      colleges,
      total,
    } =
      await collegesRepository
        .searchColleges(
          query.q,
          query.state,
          page,
          limit,
        )

    return {

      colleges,

      meta: {

        total,

        page,

        limit,

        total_pages:
          Math.ceil(
            total / limit,
          ),
      },
    }
  },
}