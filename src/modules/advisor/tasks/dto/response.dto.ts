import type {

  AdvisorTask,

  TaskWithStudent,

}
from '../tasks.types.js'

export interface AllTasksResponseDto {

  tasks:
    TaskWithStudent[]

  meta: {

    total: number
  }
}

export interface StudentTasksResponseDto {

  student_id: number

  tasks:
    AdvisorTask[]
}

export interface CreateTaskResponseDto {

  message: string

  task:
    AdvisorTask
}

export interface UpdateTaskResponseDto {

  message: string

  task:
    AdvisorTask
}

export interface DeleteTaskResponseDto {

  message: string

  task_id: number
}