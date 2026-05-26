import type {
  PriorityQueueResponseDto,
  RosterFiltersResponseDto,
  RosterResponseDto,
} from './dto/response.dto.js'

import type {
  RosterQueryInput,
} from './roster.schema.js'

import { rosterRepository }
  from './roster.repository.js'

import { buildPriorityQueue }
  from '../../../shared/utils/priority-queue.util.js'

export const rosterService = {

  getRoster: async (
    schoolId: number,
    query: RosterQueryInput,
  ): Promise<RosterResponseDto> => {

    const page =
      parseInt(query.page || '1')

    const limit =
      parseInt(query.limit || '20')

    const filters = {
      readiness_band:
        query.readiness_band,

      needs_intervention:
        query.needs_intervention === 'true',

      saved_selective:
        query.saved_selective === 'true',

      low_engagement:
        query.low_engagement === 'true',

      page,
      limit,
    }

    const {
      students,
      total,
    } = await rosterRepository.getStudents(
      schoolId,
      filters,
    )

    return {
      students,

      meta: {
        total,
        page,
        limit,
        total_pages:
          Math.ceil(total / limit),
      },
    }
  },

  getPriorityQueue: async (
    schoolId: number,
  ): Promise<PriorityQueueResponseDto> => {

    const students =
      await rosterRepository.getAllStudents(
        schoolId,
      )

    const queue =
      buildPriorityQueue(students)

    return {
      students: queue,
    }
  },

  getFilters:
  async (): Promise<RosterFiltersResponseDto> => {

    return {
      readiness_bands: [
        'foundational',
        'developing',
        'competitive',
        'strongly_competitive',
        'exceptional',
      ],

      flags: [
        {
          key: 'needs_intervention',
          label: 'Needs Intervention',
        },
        {
          key: 'saved_selective',
          label: 'Saved Selective Colleges',
        },
        {
          key: 'low_engagement',
          label: 'Low Engagement',
        },
      ],
    }
  },
}