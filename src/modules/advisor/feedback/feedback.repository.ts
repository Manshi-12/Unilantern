import {
  getPool,
  sql,
}
from '../../../db/client.js'

import type {
  AdvisorFeedback,
  FeedbackType,
}
from './feedback.types.js'

export const feedbackRepository = {

  createFeedback: async (
    data: {

      advisor_id: number

      school_id:
        number | null

      actor_role: string

      type: FeedbackType

      message: string

      allow_contact: boolean

      page_name:
        string | null

      app_version:
        string | null

      device_type:
        string | null

      screenshot_url:
        string | null
    },

  ): Promise<
    AdvisorFeedback
  > => {

    const pool =
      await getPool()

    const result =
      await pool.request()

        .input(
          'advisorId',
          sql.Int,
          data.advisor_id,
        )

        .input(
          'schoolId',
          sql.Int,
          data.school_id,
        )

        .input(
          'actorRole',
          sql.VarChar(30),
          data.actor_role,
        )

        .input(
          'type',
          sql.VarChar(50),
          data.type,
        )

        .input(
          'message',
          sql.NVarChar(sql.MAX),
          data.message,
        )

        .input(
          'allowContact',
          sql.Bit,
          data.allow_contact,
        )

        .input(
          'pageName',
          sql.NVarChar(255),
          data.page_name,
        )

        .input(
          'appVersion',
          sql.VarChar(50),
          data.app_version,
        )

        .input(
          'deviceType',
          sql.VarChar(50),
          data.device_type,
        )

        .input(
          'screenshotUrl',
          sql.NVarChar(1000),
          data.screenshot_url,
        )

        .query(`
          INSERT INTO advisor_feedback (

            advisor_id,
            school_id,
            actor_role,
            type,
            message,
            allow_contact,
            page_name,
            app_version,
            device_type,
            screenshot_url,
            status
          )

          OUTPUT INSERTED.*

          VALUES (

            @advisorId,
            @schoolId,
            @actorRole,
            @type,
            @message,
            @allowContact,
            @pageName,
            @appVersion,
            @deviceType,
            @screenshotUrl,
            'new'
          )
        `)

    return result.recordset[0]
  },
}