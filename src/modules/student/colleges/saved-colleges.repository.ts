// ── Saved Colleges Repository ────────────────────────────────────────────────
// Data-access layer for the `student_saved_colleges` table.

import { sql, getPool } from "../../../db/client.js";
import { STUDENT_SAVED_COLLEGES_TABLE } from "../../../db/schema/student-saved-colleges.js";
import { COLLEGES_TABLE } from "../../../db/schema/colleges.js";
import type {
  SavedCollegeRecord,
  SavedCollegeWithDetails,
  SaveCollegeData,
  UpdateSavedCollegeData,
} from "./colleges.types.js";

type RawSavedRow = {
  saved_college_id: number;
  student_id: number;
  college_id: number;
  status: string;
  fit_classification: string | null;
  intended_major: string | null;
  major_selectivity: string | null;
  is_in_state: boolean | null;
  readiness_band_at_save: string | null;
  saved_at: Date;
  updated_at: Date;
};

type RawSavedWithDetailsRow = RawSavedRow & {
  college_name: string;
  college_state: string | null;
  college_website_url: string | null;
  college_logo_url: string | null;
  college_acceptance_rate: number | null;
};

function mapSavedRow(row: RawSavedRow): SavedCollegeRecord {
  return {
    saved_college_id:      row.saved_college_id,
    student_id:            row.student_id,
    college_id:            row.college_id,
    status:                row.status as SavedCollegeRecord["status"],
    fit_classification:    row.fit_classification as SavedCollegeRecord["fit_classification"],
    intended_major:        row.intended_major,
    major_selectivity:     row.major_selectivity as SavedCollegeRecord["major_selectivity"],
    is_in_state:           row.is_in_state,
    readiness_band_at_save:row.readiness_band_at_save,
    saved_at:              row.saved_at,
    updated_at:            row.updated_at,
  };
}

function mapDetailRow(row: RawSavedWithDetailsRow): SavedCollegeWithDetails {
  return {
    ...mapSavedRow(row),
    college_name:            row.college_name,
    college_state:           row.college_state,
    college_website_url:     row.college_website_url,
    college_logo_url:        row.college_logo_url,
    college_acceptance_rate: row.college_acceptance_rate,
  };
}

export class SavedCollegesRepository {
  /** List all saved colleges for a student (with college details). */
  async findAllByStudentId(studentId: number): Promise<SavedCollegeWithDetails[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawSavedWithDetailsRow>(
        `SELECT
           sc.saved_college_id,
           sc.student_id,
           sc.college_id,
           sc.status,
           sc.fit_classification,
           sc.intended_major,
           sc.major_selectivity,
           sc.is_in_state,
           sc.readiness_band_at_save,
           sc.saved_at,
           sc.updated_at,
           c.name            AS college_name,
           c.state           AS college_state,
           c.website_url     AS college_website_url,
           c.logo_url        AS college_logo_url,
           c.acceptance_rate AS college_acceptance_rate
         FROM ${STUDENT_SAVED_COLLEGES_TABLE} sc
         JOIN ${COLLEGES_TABLE} c ON c.college_id = sc.college_id
        WHERE sc.student_id = @student_id
        ORDER BY sc.saved_at DESC;`,
      );
    return result.recordset.map(mapDetailRow);
  }

  /** Find a single saved college by saved_college_id + student_id (ownership check). */
  async findByIdAndStudent(
    savedCollegeId: number,
    studentId: number,
  ): Promise<SavedCollegeRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("saved_college_id", sql.Int, savedCollegeId)
      .input("student_id",       sql.Int, studentId)
      .query<RawSavedRow>(
        `SELECT TOP 1 *
           FROM ${STUDENT_SAVED_COLLEGES_TABLE}
          WHERE saved_college_id = @saved_college_id
            AND student_id      = @student_id;`,
      );
    const row = result.recordset[0];
    return row ? mapSavedRow(row) : null;
  }

  /** Check if a student already saved a specific college. */
  async existsByStudentAndCollege(
    studentId: number,
    collegeId: number,
  ): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("college_id", sql.Int, collegeId)
      .query<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt
           FROM ${STUDENT_SAVED_COLLEGES_TABLE}
          WHERE student_id = @student_id
            AND college_id = @college_id;`,
      );
    return (result.recordset[0]?.cnt ?? 0) > 0;
  }

  /** Save (bookmark) a college for a student. */
  async create(data: SaveCollegeData): Promise<SavedCollegeRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id",            sql.Int,        data.student_id)
      .input("college_id",            sql.Int,        data.college_id)
      .input("intended_major",        sql.VarChar(250), data.intended_major)
      .input("major_selectivity",     sql.VarChar(30),  data.major_selectivity)
      .input("is_in_state",           sql.Bit,        data.is_in_state != null ? (data.is_in_state ? 1 : 0) : null)
      .input("fit_classification",    sql.VarChar(20), data.fit_classification)
      .input("readiness_band_at_save",sql.VarChar(25), data.readiness_band_at_save)
      .query<RawSavedRow>(
        `INSERT INTO ${STUDENT_SAVED_COLLEGES_TABLE}
           (student_id, college_id, intended_major, major_selectivity,
            is_in_state, fit_classification, readiness_band_at_save)
         OUTPUT INSERTED.*
         VALUES
           (@student_id, @college_id, @intended_major, @major_selectivity,
            @is_in_state, @fit_classification, @readiness_band_at_save);`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("Failed to insert saved college row");
    return mapSavedRow(row);
  }

  /** Update a saved college (status, major, fit, etc). */
  async update(
    savedCollegeId: number,
    studentId: number,
    data: UpdateSavedCollegeData,
  ): Promise<SavedCollegeRecord> {
    const pool = await getPool();
    const setClauses: string[] = [];
    const req = pool.request()
      .input("saved_college_id", sql.Int, savedCollegeId)
      .input("student_id",       sql.Int, studentId);

    if (data.status !== undefined) {
      setClauses.push("status = @status");
      req.input("status", sql.VarChar(20), data.status);
    }
    if (data.intended_major !== undefined) {
      setClauses.push("intended_major = @intended_major");
      req.input("intended_major", sql.VarChar(250), data.intended_major);
    }
    if (data.major_selectivity !== undefined) {
      setClauses.push("major_selectivity = @major_selectivity");
      req.input("major_selectivity", sql.VarChar(30), data.major_selectivity);
    }
    if (data.is_in_state !== undefined) {
      setClauses.push("is_in_state = @is_in_state");
      req.input("is_in_state", sql.Bit, data.is_in_state != null ? (data.is_in_state ? 1 : 0) : null);
    }
    if (data.fit_classification !== undefined) {
      setClauses.push("fit_classification = @fit_classification");
      req.input("fit_classification", sql.VarChar(20), data.fit_classification);
    }

    if (setClauses.length === 0) {
      // Nothing to update — return existing record
      const existing = await this.findByIdAndStudent(savedCollegeId, studentId);
      if (!existing) throw new Error("Saved college not found");
      return existing;
    }

    const result = await req.query<RawSavedRow>(
      `DECLARE @output TABLE (
        saved_college_id INT,
        student_id INT,
        college_id INT,
        status VARCHAR(20),
        fit_classification VARCHAR(20) NULL,
        intended_major VARCHAR(250) NULL,
        major_selectivity VARCHAR(30) NULL,
        is_in_state BIT NULL,
        readiness_band_at_save VARCHAR(25) NULL,
        saved_at DATETIMEOFFSET,
        updated_at DATETIMEOFFSET
      );

      UPDATE ${STUDENT_SAVED_COLLEGES_TABLE}
        SET ${setClauses.join(", ")}, updated_at = SYSDATETIMEOFFSET()
      OUTPUT INSERTED.* INTO @output
      WHERE saved_college_id = @saved_college_id
        AND student_id       = @student_id;

      SELECT * FROM @output;`,
    );
    const row = result.recordset[0];
    if (!row) throw new Error("Update returned no row — saved_college_id or ownership check failed");
    return mapSavedRow(row);
  }

  /** Delete (unsave) a college for a student. */
  async delete(savedCollegeId: number, studentId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("saved_college_id", sql.Int, savedCollegeId)
      .input("student_id",       sql.Int, studentId)
      .query(
        `DELETE FROM ${STUDENT_SAVED_COLLEGES_TABLE}
          WHERE saved_college_id = @saved_college_id
            AND student_id       = @student_id;`,
      );
    return (result.rowsAffected[0] ?? 0) > 0;
  }
}
