import { z } from 'zod'

export const StudentIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Student ID must be a number'),
})