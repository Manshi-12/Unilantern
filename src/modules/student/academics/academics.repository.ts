import { sql, getPool } from "../../../db/client.js";
import { STUDENT_ACADEMICS_TABLE } from "../../../db/schema/student-academics.js";
import { STUDENT_PROFILES_TABLE } from "../../../db/schema/student-profiles.js";
import type { AcademicsRecord, UpsertAcademicsData } from "./academics.types.js";

type RawAcademicsRow = {
  academics_id: number;
  student_id: number;
  unweighted_gpa: number | null;
  course_rigor: string | null;
  test_status: string | null;
  sat_score: number | null;
  act_score: number | null;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: RawAcademicsRow): AcademicsRecord {
  return {
    academics_id: row.academics_id,
    student_id:   row.student_id,
    unweighted_gpa: row.unweighted_gpa,
    course_rigor:   row.course_rigor as AcademicsRecord["course_rigor"],
    test_status:    (row.test_status ?? (row.sat_score ? "sat" : row.act_score ? "act" : "no_test")) as AcademicsRecord["test_status"],
    sat_score:      row.sat_score,
    act_score:      row.act_score,
    created_at:     row.created_at,
    updated_at:     row.updated_at,
  };
}

export class AcademicsRepository {
  async findByStudentId(studentId: number): Promise<AcademicsRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawAcademicsRow>(
        `SELECT TOP 1 *
           FROM ${STUDENT_ACADEMICS_TABLE}
          WHERE student_id = @student_id;`,
      );
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  }

  /**
   * MERGE upsert: creates the row if absent, updates it if present.
   * SQL Server MERGE is atomic and safe under concurrent requests.
   */
  async upsert(data: UpsertAcademicsData): Promise<AcademicsRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id",     sql.Int,           data.student_id)
      .input("unweighted_gpa", sql.Decimal(4, 2),  data.unweighted_gpa)
      .input("course_rigor",   sql.VarChar(20),    data.course_rigor)
      .input("test_status",    sql.VarChar(10),    data.test_status)
      .input("sat_score",      sql.SmallInt,       data.sat_score)
      .input("act_score",      sql.SmallInt,       data.act_score)
      .query<RawAcademicsRow>(
        `DECLARE @OutputTable TABLE (
           academics_id INT,
           student_id INT,
           unweighted_gpa DECIMAL(4, 2),
           course_rigor VARCHAR(20),
           test_status VARCHAR(10),
           sat_score SMALLINT,
           act_score SMALLINT,
           created_at DATETIMEOFFSET,
           updated_at DATETIMEOFFSET
         );

         MERGE ${STUDENT_ACADEMICS_TABLE} AS tgt
         USING (SELECT @student_id AS student_id) AS src
         ON tgt.student_id = src.student_id
         WHEN MATCHED THEN
           UPDATE SET
             unweighted_gpa = @unweighted_gpa,
             course_rigor   = @course_rigor,
             test_status    = @test_status,
             sat_score      = @sat_score,
             act_score      = @act_score,
             updated_at     = SYSDATETIMEOFFSET()
         WHEN NOT MATCHED THEN
           INSERT (student_id, unweighted_gpa, course_rigor, test_status, sat_score, act_score)
           VALUES (@student_id, @unweighted_gpa, @course_rigor, @test_status, @sat_score, @act_score)
         OUTPUT
           INSERTED.academics_id,
           INSERTED.student_id,
           INSERTED.unweighted_gpa,
           INSERTED.course_rigor,
           INSERTED.test_status,
           INSERTED.sat_score,
           INSERTED.act_score,
           INSERTED.created_at,
           INSERTED.updated_at
         INTO @OutputTable;

         SELECT * FROM @OutputTable;`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("Upsert returned no row");
    return mapRow(row);
  }

  async findStudentGrade(studentId: number): Promise<number | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<{ grade: number | null }>(
        `SELECT TOP 1 grade
           FROM ${STUDENT_PROFILES_TABLE}
          WHERE student_id = @student_id;`,
      );
    return result.recordset[0]?.grade ?? null;
  }
}
