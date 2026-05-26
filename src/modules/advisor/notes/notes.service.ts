import type {

  AllNotesResponseDto,

  StudentNotesResponseDto,

  CreateNoteResponseDto,

  UpdateNoteResponseDto,

  DeleteNoteResponseDto,

}
from './dto/response.dto.js'

import {
  NotFoundError,
}
from '../../../shared/errors/app-error.js'

import {
  notesRepository,
}
from './notes.repository.js'

export const notesService = {

  // =====================================
  // API 37 — Get All Notes
  // =====================================

  getAllNotes: async (

    advisorId: number,

  ): Promise<
    AllNotesResponseDto
  > => {

    const notes =
      await notesRepository
        .findAllByAdvisor(
          advisorId,
        )

    return {

      notes,

      meta: {

        total:
          notes.length,
      },
    }
  },

  // =====================================
  // API 38 — Get Student Notes
  // =====================================

  getStudentNotes: async (

    studentId: number,

    advisorId: number,

  ): Promise<
    StudentNotesResponseDto
  > => {

    const studentExists =
      await notesRepository
        .checkStudentExists(
          studentId,
        )

    if (!studentExists) {

      throw new NotFoundError(
        'Student not found',
      )
    }

    const notes =
      await notesRepository
        .findByStudentAndAdvisor(

          studentId,

          advisorId,
        )

    return {

      student_id:
        studentId,

      notes,
    }
  },

  // =====================================
  // API 39 — Create Note
  // =====================================

  createNote: async (

    studentId: number,

    advisorId: number,

    body: {

      content: string

      tags?: string
    },

  ): Promise<
    CreateNoteResponseDto
  > => {

    const studentExists =
      await notesRepository
        .checkStudentExists(
          studentId,
        )

    if (!studentExists) {

      throw new NotFoundError(
        'Student not found',
      )
    }

    const note =
      await notesRepository
        .createNote({

          advisor_id:
            advisorId,

          student_id:
            studentId,

          content:
            body.content,

          tags:
            body.tags || null,
        })

    return {

      message:
        'Note created successfully.',

      note,
    }
  },

  // =====================================
  // API 40 — Update Note
  // =====================================

  updateNote: async (

    noteId: number,

    advisorId: number,

    body: {

      content?: string

      tags?: string
    },

  ): Promise<
    UpdateNoteResponseDto
  > => {

    const existing =
      await notesRepository
        .findNoteById(

          noteId,

          advisorId,
        )

    if (!existing) {

      throw new NotFoundError(
        'Note not found',
      )
    }

    const updated =
      await notesRepository
        .updateNote(

          noteId,

          {
            content:
              body.content,

            tags:
              body.tags,
          },
        )

    return {

      message:
        'Note updated successfully.',

      note:
        updated,
    }
  },

  // =====================================
  // API 41 — Delete Note
  // =====================================

  deleteNote: async (

    noteId: number,

    advisorId: number,

  ): Promise<
    DeleteNoteResponseDto
  > => {

    const existing =
      await notesRepository
        .findNoteById(

          noteId,

          advisorId,
        )

    if (!existing) {

      throw new NotFoundError(
        'Note not found',
      )
    }

    await notesRepository
      .softDeleteNote(

        noteId,

        advisorId,
      )

    return {

      message:
        'Note deleted successfully.',

      note_id:
        noteId,
    }
  },
}