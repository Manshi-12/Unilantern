import { z }
from 'zod'

export const StudentIdParamSchema =
  z.object({

    id:
      z.string()
        .regex(
          /^\d+$/,
          'Student ID must be numeric',
        ),
  })

export const TaskIdParamSchema =
  z.object({

    taskId:
      z.string()
        .regex(
          /^\d+$/,
          'Task ID must be numeric',
        ),
  })

export const CreateTaskSchema =
  z.object({

    title:
      z.string()

        .min(
          1,
          'Title is required',
        )

        .max(
          255,
          'Title cannot exceed 255 characters',
        ),

    student_id:
      z.number()

        .int()

        .positive({
          message:
            'student_id is required',
        }),

    due_date:
      z.string()

        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          'due_date must be YYYY-MM-DD',
        ),
  })

export const UpdateTaskSchema =
  z.object({

    title:
      z.string()

        .min(1)

        .max(255)

        .optional(),

    due_date:
      z.union([

        z.string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            'due_date must be YYYY-MM-DD',
          ),

        z.null(),

      ])

      .optional(),

  })

  .refine(

    data =>

      data.title !== undefined

      ||

      data.due_date !== undefined,

    {
      message:
        'At least one field must be provided',
    },
  )

export type CreateTaskInput =
  z.infer<
    typeof CreateTaskSchema
  >

export type UpdateTaskInput =
  z.infer<
    typeof UpdateTaskSchema
  >