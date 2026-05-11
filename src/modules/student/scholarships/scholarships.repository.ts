import { sql, getPool } from "../../../db/client.js";
import { SCHOLARSHIPS_TABLE } from "../../../db/schema/scholarships.js";
import { STUDENT_PROFILES_TABLE } from "../../../db/schema/student-profiles.js";
import { STUDENT_SAVED_SCHOLARSHIPS_TABLE } from "../../../db/schema/student-saved-scholarships.js";
import type {
  SavedScholarshipRecord,
  ScholarshipListFilters,
  ScholarshipPage,
  ScholarshipRecord,
} from "./scholarships.types.js";

const STUDENT_SAVED_COLLEGES_TABLE = "student_saved_colleges";

type RawScholarshipRow = Omit<ScholarshipRecord, "is_saved"> & {
  is_saved: boolean | number;
};

function mapScholarship(row: RawScholarshipRow): ScholarshipRecord {
  return {
    scholarship_id: row.scholarship_id,
    scholarship_name: row.scholarship_name,
    provider: row.provider,
    college_id: row.college_id,
    eligibility_summary: row.eligibility_summary,
    deadline: row.deadline,
    award_amount: row.award_amount,
    application_link: row.application_link,
    scholarship_type: row.scholarship_type,
    is_saved: Boolean(row.is_saved),
  };
}

function encodeCursor(scholarship: ScholarshipRecord): string {
  return Buffer.from(String(scholarship.scholarship_id)).toString("base64");
}

function decodeCursor(cursor?: string): number | null {
  if (!cursor) return null;
  const decoded = Number(Buffer.from(cursor, "base64").toString("utf-8"));
  return Number.isInteger(decoded) && decoded > 0 ? decoded : null;
}

export class ScholarshipsRepository {
  async getGraduationYear(studentId: number): Promise<number | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<{ graduation_year: number }>(
        `SELECT TOP 1 graduation_year
           FROM ${STUDENT_PROFILES_TABLE}
          WHERE student_id = @student_id;`,
      );
    return result.recordset[0]?.graduation_year ?? null;
  }

  async list(filters: ScholarshipListFilters): Promise<ScholarshipPage> {
    const pool = await getPool();
    const cursorId = decodeCursor(filters.cursor);
    const listRequest = pool
      .request()
      .input("student_id", sql.Int, filters.student_id)
      .input("limit", sql.Int, filters.limit + 1);
    const countRequest = pool
      .request()
      .input("student_id", sql.Int, filters.student_id);

    const where: string[] = ["s.is_active = 1"];

    if (cursorId) {
      listRequest.input("cursor_id", sql.Int, cursorId);
      countRequest.input("cursor_id", sql.Int, cursorId);
      where.push("s.scholarship_id > @cursor_id");
    }
    if (filters.type) {
      listRequest.input("scholarship_type", sql.VarChar(50), filters.type);
      countRequest.input("scholarship_type", sql.VarChar(50), filters.type);
      where.push("s.scholarship_type = @scholarship_type");
    }
    if (filters.college_id) {
      listRequest.input("college_id", sql.Int, filters.college_id);
      countRequest.input("college_id", sql.Int, filters.college_id);
      where.push("s.college_id = @college_id");
    } else if (filters.general_only) {
      where.push("s.college_id IS NULL");
    } else {
      where.push(
        `(s.college_id IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM ${STUDENT_SAVED_COLLEGES_TABLE} sc_any
             WHERE sc_any.student_id = @student_id
          )
          OR EXISTS (
            SELECT 1 FROM ${STUDENT_SAVED_COLLEGES_TABLE} sc
             WHERE sc.student_id = @student_id AND sc.college_id = s.college_id
          ))`,
      );
    }
    if (filters.graduation_year !== null) {
      listRequest.input("graduation_year", sql.Int, filters.graduation_year);
      countRequest.input("graduation_year", sql.Int, filters.graduation_year);
      where.push(
        `(s.applicable_grad_years IS NULL
          OR s.applicable_grad_years = '[]'
          OR LTRIM(RTRIM(s.applicable_grad_years)) = ''
          OR EXISTS (
              SELECT 1
                FROM OPENJSON(
                  CASE
                    WHEN ISJSON(s.applicable_grad_years) = 1 THEN s.applicable_grad_years
                    ELSE '[]'
                  END
                )
               WHERE TRY_CONVERT(INT, value) = @graduation_year
            )
          OR (
              ISJSON(s.applicable_grad_years) = 0
              AND EXISTS (
                SELECT 1
                  FROM STRING_SPLIT(s.applicable_grad_years, ',')
                 WHERE TRY_CONVERT(INT, LTRIM(RTRIM(value))) = @graduation_year
              )
            ))`,
      );
    }

    const whereClause = where.join(" AND ");
    const orderBy =
      filters.sort === "deadline_desc"
        ? "CASE WHEN s.deadline IS NULL THEN 1 ELSE 0 END ASC, s.deadline DESC, s.scholarship_id ASC"
        : filters.sort === "amount_desc"
          ? "TRY_CONVERT(DECIMAL(18,2), REPLACE(REPLACE(s.award_amount, '$', ''), ',', '')) DESC, s.scholarship_id ASC"
          : "CASE WHEN s.deadline IS NULL THEN 1 ELSE 0 END ASC, s.deadline ASC, s.scholarship_id ASC";

    const [rowsResult, countResult] = await Promise.all([
      listRequest.query<RawScholarshipRow>(
        `SELECT TOP (@limit)
            s.scholarship_id, s.scholarship_name, s.provider, s.college_id,
            s.eligibility_summary, s.deadline, s.award_amount, s.application_link,
            s.scholarship_type,
            CASE WHEN ss.saved_scholarship_id IS NULL THEN 0 ELSE 1 END AS is_saved
           FROM ${SCHOLARSHIPS_TABLE} s
           LEFT JOIN ${STUDENT_SAVED_SCHOLARSHIPS_TABLE} ss
             ON ss.scholarship_id = s.scholarship_id
            AND ss.student_id = @student_id
          WHERE ${whereClause}
          ORDER BY ${orderBy};`,
      ),
      countRequest.query<{ total: number }>(
        `SELECT COUNT(*) AS total
           FROM ${SCHOLARSHIPS_TABLE} s
          WHERE ${whereClause};`,
      ),
    ]);

    const rows = rowsResult.recordset;
    const hasMore = rows.length > filters.limit;
    const scholarships = (hasMore ? rows.slice(0, filters.limit) : rows).map(mapScholarship);
    const last = scholarships[scholarships.length - 1];

    return {
      scholarships,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last) : null,
      total: countResult.recordset[0]?.total ?? scholarships.length,
    };
  }

  async findActiveById(scholarshipId: number, studentId: number): Promise<ScholarshipRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("scholarship_id", sql.Int, scholarshipId)
      .input("student_id", sql.Int, studentId)
      .query<RawScholarshipRow>(
        `SELECT TOP 1
            s.scholarship_id, s.scholarship_name, s.provider, s.college_id,
            s.eligibility_summary, s.deadline, s.award_amount, s.application_link,
            s.scholarship_type,
            CASE WHEN ss.saved_scholarship_id IS NULL THEN 0 ELSE 1 END AS is_saved
           FROM ${SCHOLARSHIPS_TABLE} s
           LEFT JOIN ${STUDENT_SAVED_SCHOLARSHIPS_TABLE} ss
             ON ss.scholarship_id = s.scholarship_id
            AND ss.student_id = @student_id
          WHERE s.scholarship_id = @scholarship_id
            AND s.is_active = 1;`,
      );
    const row = result.recordset[0];
    return row ? mapScholarship(row) : null;
  }

  async save(studentId: number, scholarshipId: number): Promise<SavedScholarshipRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("scholarship_id", sql.Int, scholarshipId)
      .query<SavedScholarshipRecord>(
        `INSERT INTO ${STUDENT_SAVED_SCHOLARSHIPS_TABLE} (student_id, scholarship_id)
         OUTPUT INSERTED.saved_scholarship_id, INSERTED.scholarship_id, INSERTED.student_id, INSERTED.saved_at
         VALUES (@student_id, @scholarship_id);`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("Failed to save scholarship");
    return row;
  }

  async isSaved(studentId: number, scholarshipId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("scholarship_id", sql.Int, scholarshipId)
      .query<{ count: number }>(
        `SELECT COUNT(*) AS count
           FROM ${STUDENT_SAVED_SCHOLARSHIPS_TABLE}
          WHERE student_id = @student_id AND scholarship_id = @scholarship_id;`,
      );
    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async deleteSaved(studentId: number, savedId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("saved_scholarship_id", sql.Int, savedId)
      .query(
        `DELETE FROM ${STUDENT_SAVED_SCHOLARSHIPS_TABLE}
          WHERE student_id = @student_id AND saved_scholarship_id = @saved_scholarship_id;`,
      );
    return result.rowsAffected[0] ?? 0;
  }
}
