export interface AdvisorTask {

  task_id: number

  advisor_id: number

  student_id:
    number | null

  title: string

  due_date:
    Date | null

  created_at: Date

  updated_at: Date

  deleted_at:
    Date | null
}

export interface TaskWithStudent
  extends AdvisorTask {

  student_name:
    string | null
}