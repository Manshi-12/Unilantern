import { z }
from 'zod'

export const StudentIdParamSchema =
  z.object({

    id:
      z.string()
        .regex(
          /^\d+$/,
          'Student ID must be a number',
        ),
  })

export const ConsentTypeParamSchema =
  z.object({

    id:
      z.string()
        .regex(
          /^\d+$/,
          'Student ID must be a number',
        ),

    type:
      z.enum([
        'ec_sharing',
        'essay_sharing',
        'advisor_visibility',
        'school_reporting',
        'college_data_share',
      ]),
  })