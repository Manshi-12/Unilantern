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

export const NoteIdParamSchema =
  z.object({

    noteId:
      z.string()
        .regex(
          /^\d+$/,
          'Note ID must be a number',
        ),
  })

export const CreateNoteSchema =
  z.object({

    content:
      z.string()

        .min(
          1,
          'Content is required',
        )

        .max(
          5000,
          'Content must be under 5000 characters',
        ),

    tags:
      z.string()

        .max(
          500,
          'Tags must be under 500 characters',
        )

        .optional(),
  })

export const UpdateNoteSchema =
  z.object({

    content:
      z.string()

        .min(
          1,
          'Content cannot be empty',
        )

        .max(
          5000,
          'Content must be under 5000 characters',
        )

        .optional(),

    tags:
      z.string()

        .max(
          500,
          'Tags must be under 500 characters',
        )

        .optional(),
  })

  .refine(

    data =>

      data.content !==
        undefined

      ||

      data.tags !==
        undefined,

    {
      message:
        'At least one field (content or tags) must be provided',
    },
  )

export type CreateNoteInput =
  z.infer<
    typeof CreateNoteSchema
  >

export type UpdateNoteInput =
  z.infer<
    typeof UpdateNoteSchema
  >