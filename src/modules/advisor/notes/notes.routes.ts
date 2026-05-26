import {
  Router,
}
from 'express'

import {
  notesController,
}
from './notes.controller.js'

const router = Router()

// =====================================
// API 37 — Get All Notes
// =====================================

router.get(
  '/',
  notesController
    .getAllNotes,
)

// =====================================
// API 38 — Get Student Notes
// =====================================

router.get(
  '/students/:id',
  notesController
    .getStudentNotes,
)

// =====================================
// API 39 — Create Note
// =====================================

router.post(
  '/students/:id',
  notesController
    .createNote,
)

// =====================================
// API 40 — Update Note
// =====================================

router.put(
  '/:noteId',
  notesController
    .updateNote,
)

// =====================================
// API 41 — Delete Note
// =====================================

router.delete(
  '/:noteId',
  notesController
    .deleteNote,
)

export default router