import { sql, getPool } from "../../../db/client.js";
import { HONORS_AWARDS_TABLE } from "../../../db/schema/honors-awards.js";
import type { AwardRecord, CreateAwardData, UpdateAwardData } from "./awards.types.js";

type RawAwardRow = {
  award_id: number;
  student_id: number;
  award_name: string;
  award_level: string;
  frequency: string;
  annual_since_grade: number | null;
  display_order: number;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: RawAwardRow): AwardRecord {
  return {
    award_id:           row.award_id,
    student_id:         row.student_id,
    award_name:         row.award_name,
    award_level:        row.award_level as AwardRecord["award_level"],
    frequency:          row.frequency   as AwardRecord["frequency"],
    annual_since_grade: row.annual_since_grade,
    display_order:      row.display_order,
    created_at:         row.created_at,
    updated_at:         row.updated_at,
  };
}

export class AwardsRepository {
  async findAllByStudentId(studentId: number): Promise<AwardRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawAwardRow>(
        `SELECT *
           FROM ${HONORS_AWARDS_TABLE}
          WHERE student_id = @student_id
          ORDER BY display_order ASC, award_id ASC;`,
      );
    return result.recordset.map(mapRow);
  }

  async findByIdAndStudent(
    awardId: number,
    studentId: number,
  ): Promise<AwardRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("award_id",   sql.Int, awardId)
      .input("student_id", sql.Int, studentId)
      .query<RawAwardRow>(
        `SELECT TOP 1 *
           FROM ${HONORS_AWARDS_TABLE}
          WHERE award_id   = @award_id
            AND student_id = @student_id;`,
      );
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  }

  async create(data: CreateAwardData): Promise<AwardRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id",         sql.Int,        data.student_id)
      .input("award_name",         sql.VarChar(350), data.award_name)
      .input("award_level",        sql.VarChar(10),  data.award_level)
      .input("frequency",          sql.VarChar(20),  data.frequency)
      .input("annual_since_grade", sql.SmallInt,     data.annual_since_grade)
      .input("display_order",      sql.SmallInt,     data.display_order)
      .query<RawAwardRow>(
        `DECLARE @OutputTable TABLE (
            award_id INT, student_id INT, award_name VARCHAR(350), 
            award_level VARCHAR(10), frequency VARCHAR(20), 
            annual_since_grade SMALLINT, display_order SMALLINT, 
            created_at DATETIMEOFFSET, updated_at DATETIMEOFFSET
         );

         INSERT INTO ${HONORS_AWARDS_TABLE}
            (student_id, award_name, award_level, frequency, annual_since_grade, display_order)
         OUTPUT INSERTED.* INTO @OutputTable
         VALUES
            (@student_id, @award_name, @award_level, @frequency, @annual_since_grade, @display_order);

         SELECT * FROM @OutputTable;`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("Failed to insert award row");
    return mapRow(row);
  }

  async update(
    awardId: number,
    studentId: number,
    data: UpdateAwardData,
  ): Promise<AwardRecord> {
    const pool = await getPool();

    // Build dynamic SET clause — only update fields that were explicitly provided.
    const setClauses: string[] = ["updated_at = SYSDATETIMEOFFSET()"];
    const req = pool.request()
      .input("award_id",   sql.Int, awardId)
      .input("student_id", sql.Int, studentId);

    if (data.award_name !== undefined) {
      setClauses.push("award_name = @award_name");
      req.input("award_name", sql.VarChar(350), data.award_name);
    }
    if (data.award_level !== undefined) {
      setClauses.push("award_level = @award_level");
      req.input("award_level", sql.VarChar(10), data.award_level);
    }
    if (data.frequency !== undefined) {
      setClauses.push("frequency = @frequency");
      req.input("frequency", sql.VarChar(20), data.frequency);
    }
    if ("annual_since_grade" in data) {
      setClauses.push("annual_since_grade = @annual_since_grade");
      req.input("annual_since_grade", sql.SmallInt, data.annual_since_grade ?? null);
    }
    if (data.display_order !== undefined) {
      setClauses.push("display_order = @display_order");
      req.input("display_order", sql.SmallInt, data.display_order);
    }

    const result = await req.query<RawAwardRow>(
      `DECLARE @OutputTable TABLE (
          award_id INT, student_id INT, award_name VARCHAR(350), 
          award_level VARCHAR(10), frequency VARCHAR(20), 
          annual_since_grade SMALLINT, display_order SMALLINT, 
          created_at DATETIMEOFFSET, updated_at DATETIMEOFFSET
       );

       UPDATE ${HONORS_AWARDS_TABLE}
          SET ${setClauses.join(", ")}
        OUTPUT INSERTED.* INTO @OutputTable
        WHERE award_id = @award_id AND student_id = @student_id;

        SELECT * FROM @OutputTable;`,
    );
    const row = result.recordset[0];
    if (!row) throw new Error("Update returned no row — award_id or ownership check failed");
    return mapRow(row);
  }

  async delete(awardId: number, studentId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("award_id",   sql.Int, awardId)
      .input("student_id", sql.Int, studentId)
      .query(
        `DELETE FROM ${HONORS_AWARDS_TABLE}
          WHERE award_id = @award_id AND student_id = @student_id;`,
      );
    return (result.rowsAffected[0] ?? 0) > 0;
  }
}
