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
      'WHERE 1=1'

    if (query) {

      whereClause += `
        AND college_name LIKE '%' + @query + '%'
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
          SELECT COUNT(*) AS total
          FROM colleges
          ${whereClause}
        `)

    const total =
      countResult.recordset[0]
        .total

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
          SELECT *
          FROM colleges
          ${whereClause}

          ORDER BY college_name

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