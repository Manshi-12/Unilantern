import { getPool, sql } from '../../../../database/db';

/**
 * PublicRepository — all MSSQL queries for the public module.
 *
 * Tables used (read-only):
 *   schools                     — school_id, school_name, state, email_domain,
 *                                 registration_status
 *   school_readiness_snapshots  — snapshot_id, school_id, snapshot_date,
 *                                 grade_level, foundational_count,
 *                                 developing_count, competitive_count,
 *                                 strongly_competitive_count,
 *                                 exceptional_count, total_students,
 *                                 pct_improved, created_at
 *   colleges                    — college_id, name, state, city, type,
 *                                 website, created_at
 *
 * No writes occur in this module — all endpoints are public read-only.
 */
export class PublicRepository {

  // ─── Schools ───────────────────────────────────────────────────────────────

  async findPublicSchoolById(school_id: number): Promise<{
    school_id: number;
    school_name: string;
    state: string;
    email_domain: string;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 1
          school_id,
          school_name,
          state,
          email_domain
        FROM schools
        WHERE school_id           = @school_id
          AND registration_status = 'active'
      `);
    return result.recordset[0] ?? null;
  }

  // ─── school_readiness_snapshots ────────────────────────────────────────────

  async findReadinessDistributionBySchoolId(school_id: number): Promise<{
    snapshot_id: number;
    school_id: number;
    snapshot_date: Date;
    grade_level: number | null;
    foundational_count: number;
    developing_count: number;
    competitive_count: number;
    strongly_competitive_count: number;
    exceptional_count: number;
    total_students: number;
    pct_improved: number;
  }[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          snapshot_id,
          school_id,
          snapshot_date,
          grade_level,
          foundational_count,
          developing_count,
          competitive_count,
          strongly_competitive_count,
          exceptional_count,
          total_students,
          pct_improved
        FROM school_readiness_snapshots
        WHERE school_id = @school_id
        ORDER BY snapshot_date DESC, grade_level ASC
      `);
    return result.recordset;
  }

  // ─── Colleges ──────────────────────────────────────────────────────────────

  async findColleges(params: {
    search?: string;
    offset: number;
    limit: number;
  }): Promise<{
    data: {
      college_id: number;
      name: string;
      state: string;
      city: string;
      type: string;
      website: string;
    }[];
    total: number;
  }> {
    const pool = await getPool();
    const request = pool.request()
      .input('limit',  sql.Int, params.limit)
      .input('offset', sql.Int, params.offset);

    // Build optional search filter
    let searchFilter = '';
    if (params.search) {
      request.input('search', sql.NVarChar(200), `%${params.search}%`);
      searchFilter = `WHERE name LIKE @search`;
    }

    const result = await request.query(`
      SELECT
        college_id,
        name,
        state,
        city,
        type,
        website,
        COUNT(*) OVER() AS total_count
      FROM colleges
      ${searchFilter}
      ORDER BY name ASC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    const total = result.recordset[0]?.total_count ?? 0;

    const data = result.recordset.map(({ total_count, ...row }) => row);

    return { data, total };
  }

  async findCollegeById(college_id: number): Promise<{
    college_id: number;
    name: string;
    state: string;
    city: string;
    type: string;
    website: string;
    created_at: Date;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('college_id', sql.Int, college_id)
      .query(`
        SELECT TOP 1
          college_id,
          name,
          state,
          city,
          type,
          website,
          created_at
        FROM colleges
        WHERE college_id = @college_id
      `);
    return result.recordset[0] ?? null;
  }
}




