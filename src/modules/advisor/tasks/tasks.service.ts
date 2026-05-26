import type {

  AllTasksResponseDto,

  StudentTasksResponseDto,

  CreateTaskResponseDto,

  UpdateTaskResponseDto,

  DeleteTaskResponseDto,

}
from './dto/response.dto.js'

import {
  NotFoundError,
}
from '../../../shared/errors/app-error.js'

import {
  tasksRepository,
}
from './tasks.repository.js'

export const tasksService = {

  // =====================================
  // API 42 — Get All Tasks
  // =====================================

  getAllTasks: async (

    advisorId: number,

  ): Promise<
    AllTasksResponseDto
  > => {

    const tasks =
      await tasksRepository
        .findAllByAdvisor(
          advisorId,
        )

    return {

      tasks,

      meta: {

        total:
          tasks.length,
      },
    }
  },

  // =====================================
  // API 43 — Get Student Tasks
  // =====================================

  getStudentTasks: async (

    studentId: number,

    advisorId: number,

  ): Promise<
    StudentTasksResponseDto
  > => {

    const studentExists =
      await tasksRepository
        .checkStudentExists(
          studentId,
        )

    if (!studentExists) {

      throw new NotFoundError(
        'Student not found',
      )
    }

    const tasks =
      await tasksRepository
        .findByStudentAndAdvisor(

          studentId,

          advisorId,
        )

    return {

      student_id:
        studentId,

      tasks,
    }
  },

  // =====================================
  // API 44 — Create Task
  // =====================================

  createTask: async (

    advisorId: number,

    body: {

      title: string

      student_id: number

      due_date: string
    },

  ): Promise<
    CreateTaskResponseDto
  > => {

    const studentExists =
      await tasksRepository
        .checkStudentExists(
          body.student_id,
        )

    if (!studentExists) {

      throw new NotFoundError(
        'Student not found',
      )
    }

    const dueDate =
      new Date(
        body.due_date,
      )

    const task =
      await tasksRepository
        .createTask({

          advisor_id:
            advisorId,

          student_id:
            body.student_id,

          title:
            body.title,

          due_date:
            dueDate,
        })

    return {

      message:
        'Task created successfully.',

      task,
    }
  },

  // =====================================
  // API 45 — Update Task
  // =====================================

  updateTask: async (

    taskId: number,

    advisorId: number,

    body: {

      title?: string

      due_date?:
        string | null
    },

  ): Promise<
    UpdateTaskResponseDto
  > => {

    const existing =
      await tasksRepository
        .findTaskById(

          taskId,

          advisorId,
        )

    if (!existing) {

      throw new NotFoundError(
        'Task not found',
      )
    }

    const updates: {

      title?: string

      due_date?:
        Date | null

    } = {}

    if (
      body.title !== undefined
    ) {

      updates.title =
        body.title
    }

    if (
      body.due_date !== undefined
    ) {

      updates.due_date =
        body.due_date
          ? new Date(
              body.due_date,
            )
          : null
    }

    const updated =
      await tasksRepository
        .updateTask(

          taskId,

          updates,
        )

    return {

      message:
        'Task updated successfully.',

      task:
        updated,
    }
  },

  // =====================================
  // API 46 — Delete Task
  // =====================================

  deleteTask: async (

    taskId: number,

    advisorId: number,

  ): Promise<
    DeleteTaskResponseDto
  > => {

    const existing =
      await tasksRepository
        .findTaskById(

          taskId,

          advisorId,
        )

    if (!existing) {

      throw new NotFoundError(
        'Task not found',
      )
    }

    await tasksRepository
      .softDeleteTask(

        taskId,

        advisorId,
      )

    return {

      message:
        'Task deleted successfully.',

      task_id:
        taskId,
    }
  },
}