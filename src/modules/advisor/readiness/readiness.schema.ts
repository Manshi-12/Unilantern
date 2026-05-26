import { z } from 'zod'

export const StudentIdParamSchema = z.object({
  studentId:
    z.string()
      .regex(/^\d+$/, 'Student ID must be a number'),
})

export const SchoolIdParamSchema = z.object({
  schoolId:
    z.string()
      .regex(/^\d+$/, 'School ID must be a number'),
})