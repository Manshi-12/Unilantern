import type {

  AdvisorNote,

  NoteWithStudent,

}
from '../notes.types.js'

export interface AllNotesResponseDto {

  notes:
    NoteWithStudent[]

  meta: {

    total: number
  }
}

export interface StudentNotesResponseDto {

  student_id: number

  notes:
    AdvisorNote[]
}

export interface CreateNoteResponseDto {

  message: string

  note:
    AdvisorNote
}

export interface UpdateNoteResponseDto {

  message: string

  note:
    AdvisorNote
}

export interface DeleteNoteResponseDto {

  message: string

  note_id: number
}