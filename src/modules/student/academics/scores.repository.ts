import { sql, getPool } from "../../../db/client.js";
import { STUDENT_SCORES_TABLE } from "../../../db/schema/student-scores.js";
import type { AcademicsScores } from "./academics.scorer.js";
import type { AwardsScores } from "../awards/awards.scorer.js";
import type { ExtracurricularScores } from "../extracurriculars/extracurriculars.scorer.js";

import type { EssayScores } from "../essay/essay.scorer.js";

export class ScoresRepository {
  async upsertAcademicsScores(
    studentId: number,
    scores:    AcademicsScores,
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id",             sql.Int,          studentId)
      .input("gpa_norm",               sql.Decimal(5, 4), scores.gpa_norm)
      .input("rigor_norm",             sql.Decimal(5, 4), scores.rigor_norm)
      .input("test_norm",              sql.Decimal(5, 4), scores.test_norm)
      .input("test_present",           sql.Bit,           scores.test_present ? 1 : 0)
      .input("gpa_contrib",            sql.Decimal(6, 2), scores.gpa_contrib)
      .input("rigor_contrib",          sql.Decimal(6, 2), scores.rigor_contrib)
      .input("test_contrib",           sql.Decimal(6, 2), scores.test_contrib)
      .input("academics_contrib",      sql.Decimal(6, 2), scores.academics_contrib)
      .input("academics_cap_applied",  sql.Bit,           scores.academics_cap_applied ? 1 : 0)
      .query(
        `MERGE ${STUDENT_SCORES_TABLE} AS tgt
         USING (SELECT @student_id AS student_id) AS src
         ON tgt.student_id = src.student_id
         WHEN MATCHED THEN
           UPDATE SET
             gpa_norm              = @gpa_norm,
             rigor_norm            = @rigor_norm,
             test_norm             = @test_norm,
             test_present          = @test_present,
             gpa_contrib           = @gpa_contrib,
             rigor_contrib         = @rigor_contrib,
             test_contrib          = @test_contrib,
             academics_contrib     = @academics_contrib,
             academics_cap_applied = @academics_cap_applied,
             updated_at            = SYSDATETIMEOFFSET()
         WHEN NOT MATCHED THEN
           INSERT (
             student_id, gpa_norm, rigor_norm, test_norm, test_present,
             gpa_contrib, rigor_contrib, test_contrib, academics_contrib, academics_cap_applied
           )
           VALUES (
             @student_id, @gpa_norm, @rigor_norm, @test_norm, @test_present,
             @gpa_contrib, @rigor_contrib, @test_contrib, @academics_contrib, @academics_cap_applied
           );`,
      );
  }

  async upsertAwardsScores(
    studentId: number,
    scores:    AwardsScores,
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id",     sql.Int,          studentId)
      .input("awards_raw",     sql.Decimal(6, 4), scores.awards_raw)
      .input("awards_norm",    sql.Decimal(5, 4), scores.awards_norm)
      .input("awards_contrib", sql.Decimal(6, 2), scores.awards_contrib)
      .query(
        `MERGE ${STUDENT_SCORES_TABLE} AS tgt
         USING (SELECT @student_id AS student_id) AS src
         ON tgt.student_id = src.student_id
         WHEN MATCHED THEN
           UPDATE SET
             awards_raw     = @awards_raw,
             awards_norm    = @awards_norm,
             awards_contrib = @awards_contrib,
             updated_at     = SYSDATETIMEOFFSET()
         WHEN NOT MATCHED THEN
           INSERT (student_id, awards_raw, awards_norm, awards_contrib)
           VALUES (@student_id, @awards_raw, @awards_norm, @awards_contrib);`,
      );
  }

  async upsertExtracurricularScores(
    studentId: number,
    scores: ExtracurricularScores,
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("ec_norm", sql.Decimal(5, 4), scores.ec_norm)
      .input("ec_contrib", sql.Decimal(6, 2), scores.ec_contrib)
      .input("ec_early_strength_bonus", sql.Decimal(5, 4), scores.ec_early_strength_bonus)
      .input("ec_band", sql.VarChar(25), scores.ec_band)
      .input("has_founder_ec", sql.Bit, scores.has_founder_ec ? 1 : 0)
      .input("has_independent_impact", sql.Bit, scores.has_independent_impact ? 1 : 0)
      .query(
        `MERGE ${STUDENT_SCORES_TABLE} AS tgt
         USING (SELECT @student_id AS student_id) AS src
         ON tgt.student_id = src.student_id
         WHEN MATCHED THEN
           UPDATE SET
             ec_norm = @ec_norm,
             ec_contrib = @ec_contrib,
             ec_early_strength_bonus = @ec_early_strength_bonus,
             ec_band = @ec_band,
             has_founder_ec = @has_founder_ec,
             has_independent_impact = @has_independent_impact,
             updated_at = SYSDATETIMEOFFSET()
         WHEN NOT MATCHED THEN
           INSERT (
             student_id, ec_norm, ec_contrib, ec_early_strength_bonus,
             ec_band, has_founder_ec, has_independent_impact
           )
           VALUES (
             @student_id, @ec_norm, @ec_contrib, @ec_early_strength_bonus,
             @ec_band, @has_founder_ec, @has_independent_impact
           );`,
      );
  }



  async upsertEssayScores(
    studentId: number,
    scores:    EssayScores,
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id",     sql.Int,          studentId)
      .input("essay_norm",     sql.Decimal(5, 4), scores.essay_norm)
      .input("essay_contrib",  sql.Decimal(6, 2), scores.essay_contrib)
      .query(
        `MERGE ${STUDENT_SCORES_TABLE} AS tgt
         USING (SELECT @student_id AS student_id) AS src
         ON tgt.student_id = src.student_id
         WHEN MATCHED THEN
           UPDATE SET
             essay_norm    = @essay_norm,
             essay_contrib = @essay_contrib,
             updated_at    = SYSDATETIMEOFFSET()
         WHEN NOT MATCHED THEN
           INSERT (student_id, essay_norm, essay_contrib)
           VALUES (@student_id, @essay_norm, @essay_contrib);`,
      );
  }
}
