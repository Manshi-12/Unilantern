import {
  getPool,
  sql,
}
from '../../../db/client.js'

import type {
  College,
}
from './colleges.types.js'

export const collegesRepository = {

  searchColleges: async (

    query: string | undefined,

    state: string | undefined,

    page: number,

    limit: number,

  ): Promise<{
    colleges: College[]
    total: number
  }> => {

    const pool =
      await getPool()

    let whereClause =
      `
        WHERE is_active = 1
      `

    if (query) {

      whereClause += `
        AND name
          LIKE '%' + @query + '%'
      `
    }

    if (state) {

      whereClause += `
        AND state = @state
      `
    }

    const countResult =
      await pool.request()

        .input(
          'query',
          sql.VarChar,
          query || null,
        )

        .input(
          'state',
          sql.VarChar,
          state || null,
        )

        .query(`
          SELECT
            COUNT(*) AS total

          FROM colleges

          ${whereClause}
        `)

    const total =
      countResult.recordset[0]
        ?.total ?? 0

    const offset =
      (page - 1) * limit

    const result =
      await pool.request()

        .input(
          'query',
          sql.VarChar,
          query || null,
        )

        .input(
          'state',
          sql.VarChar,
          state || null,
        )

        .input(
          'offset',
          sql.Int,
          offset,
        )

        .input(
          'limit',
          sql.Int,
          limit,
        )

        .query(`
          SELECT

            college_id,

            name,

            state,

            region,

            institution_type,

            is_public,

            website_url,

            acceptance_rate,

            is_test_optional,

            gpa_25th,

            gpa_75th,

            sat_25th,

            sat_75th,

            act_25th,

            act_75th,

            logo_url,

            data_source,

            last_data_refresh,

            is_active,

            created_at,

            updated_at

          FROM colleges

          ${whereClause}

          ORDER BY
            name ASC

          OFFSET @offset ROWS

          FETCH NEXT @limit ROWS ONLY
        `)

    return {

      colleges:
        result.recordset,

      total,
    }
  },
}