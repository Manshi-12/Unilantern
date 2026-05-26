export interface CreateNoteBodyDto {

  content: string

  tags?: string
}

export interface UpdateNoteBodyDto {

  content?: string

  tags?: string
}