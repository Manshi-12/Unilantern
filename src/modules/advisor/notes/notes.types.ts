export interface AdvisorNote {

  note_id: number

  advisor_id: number

  student_id: number

  content: string

  tags:
    string | null

  created_at: Date

  updated_at: Date

  deleted_at:
    Date | null
}

export interface NoteWithStudent
  extends AdvisorNote {

  student_name: string
}