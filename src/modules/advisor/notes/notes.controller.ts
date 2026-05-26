import type {
  Request,
  Response,
  NextFunction,
}
from 'express'

import {
  StudentIdParamSchema,
  NoteIdParamSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
}
from './notes.schema.js'

import {
  notesService,
}
from './notes.service.js'

export const notesController = {

  // =====================================
  // API 37 — Get All Notes
  // =====================================

  getAllNotes: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const advisorId =
      res.locals.advisorId

      const result =
        await notesService
          .getAllNotes(
            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 38 — Get Student Notes
  // =====================================

  getStudentNotes: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .parse(req.params)

      const studentId =
        Number(parsed.id)

      const advisorId =
      res.locals.advisorId

      const result =
        await notesService
          .getStudentNotes(
            studentId,
            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 39 — Create Note
  // =====================================

  createNote: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        StudentIdParamSchema
          .parse(req.params)

      const body =
        CreateNoteSchema
          .parse(req.body)

      const studentId =
        Number(parsed.id)

      const advisorId =
      res.locals.advisorId

      const result =
        await notesService
          .createNote(
            studentId,
            advisorId,
            body,
          )

      return res.status(201).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 40 — Update Note
  // =====================================

  updateNote: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        NoteIdParamSchema
          .parse(req.params)

      const body =
        UpdateNoteSchema
          .parse(req.body)

      const noteId =
        Number(parsed.noteId)

      const advisorId =
      res.locals.advisorId

      const result =
        await notesService
          .updateNote(
            noteId,
            advisorId,
            body,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },

  // =====================================
  // API 41 — Delete Note
  // =====================================

  deleteNote: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {

    try {

      const parsed =
        NoteIdParamSchema
          .parse(req.params)

      const noteId =
        Number(parsed.noteId)

      const advisorId =
      res.locals.advisorId

      const result =
        await notesService
          .deleteNote(
            noteId,
            advisorId,
          )

      return res.status(200).json({
        data: result,
      })

    } catch (err) {

      next(err)
    }
  },
}