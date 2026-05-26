export interface CreateTaskBodyDto {

  title: string

  student_id: number

  due_date: string
}

export interface UpdateTaskBodyDto {

  title?: string

  due_date?:
    string | null
}