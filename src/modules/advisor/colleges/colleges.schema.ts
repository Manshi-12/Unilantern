import { z }
from 'zod'

export const CollegeSearchSchema =
  z.object({

    q:
      z.string()
        .optional(),

    state:
      z.string()
        .optional(),

    page:
      z.string()
        .optional()
        .default('1'),

    limit:
      z.string()
        .optional()
        .default('20'),
  })

export type CollegeSearchInput =
  z.infer<
    typeof CollegeSearchSchema
  >