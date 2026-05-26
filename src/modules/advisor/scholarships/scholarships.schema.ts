import { z }
  from 'zod'

export const StudentIdParamSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'Student ID must be numeric'),
})

export const FlagParamSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'Student ID must be numeric'),

  scholarshipId: z.string()
    .regex(/^\d+$/, 'Scholarship ID must be numeric'),
})

export const FlagBodySchema = z.object({

    action: z.enum([
        'flag',
        'unflag',
      ]),
  
    note: z.string()
      .max(500, 'Note cannot exceed 500 characters')
      .optional(),
  })