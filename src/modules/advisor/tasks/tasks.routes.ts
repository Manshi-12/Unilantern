import {
  Router,
}
from 'express'

import {
  tasksController,
}
from './tasks.controller.js'

const router = Router()

// =====================================
// API 42 — Get All Tasks
// =====================================

router.get(
  '/',
  tasksController
    .getAllTasks,
)

// =====================================
// API 43 — Get Student Tasks
// =====================================

router.get(
  '/students/:id',
  tasksController
    .getStudentTasks,
)

// =====================================
// API 44 — Create Task
// =====================================

router.post(
  '/',
  tasksController
    .createTask,
)

// =====================================
// API 45 — Update Task
// =====================================

router.put(
  '/:taskId',
  tasksController
    .updateTask,
)

// =====================================
// API 46 — Delete Task
// =====================================

router.delete(
  '/:taskId',
  tasksController
    .deleteTask,
)

export default router