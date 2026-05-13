import { sql, getPool } from "../../../db/client.js";
import { STUDENT_ESSAYS_TABLE } from "../../../db/schema/student-essays.js";
import type {
  EssayRecord,
  EssayStatus,
  NotStartedReason,
  ReviewerType,
  SaveContentData,
  AdvanceStatusData,
  ConfirmReviewerData,
  FinalizeData,
} from "./essay.types.js";

type RawEssayRow = {
  essay_id:               number;
  student_id:             number;
  essay_prompt:           string | null;
  essay_text:             string | null;
  word_count:             number;
  essay_status:           string;
  not_started_reason:     string | null;
  reviewer_type:          string | null;
  reviewer_confirmed:     boolean;
  last_major_edit_at:     Date | null;
  reflection_lock_until:  Date | null;
  draft_saved_at:         Date | null;
  revised_at:             Date | null;
  reviewed_at:            Date | null;
  finalized_at:           Date | null;
  finalization_confirmed: boolean;
  previous_word_count:    number;
  edit_session_count:     number;
  repetition_detected:    boolean;
  created_at:             Date;
  updated_at:             Date;
};

function mapRow(row: RawEssayRow): EssayRecord {
  return {
    essay_id:               row.essay_id,
    student_id:             row.student_id,
    essay_prompt:           row.essay_prompt,
    essay_text:             row.essay_text,
    word_count:             row.word_count,
    essay_status:           row.essay_status           as EssayStatus,
    not_started_reason:     row.not_started_reason     as NotStartedReason | null,
    reviewer_type:          row.reviewer_type          as ReviewerType | null,
    reviewer_confirmed:     Boolean(row.reviewer_confirmed),
    last_major_edit_at:     row.last_major_edit_at,
    reflection_lock_until:  row.reflection_lock_until,
    draft_saved_at:         row.draft_saved_at,
    revised_at:             row.revised_at,
    reviewed_at:            row.reviewed_at,
    finalized_at:           row.finalized_at,
    finalization_confirmed: Boolean(row.finalization_confirmed),
    previous_word_count:    row.previous_word_count,
    edit_session_count:     row.edit_session_count,
    repetition_detected:    Boolean(row.repetition_detected),
    created_at:             row.created_at,
    updated_at:             row.updated_at,
  };
}

export class EssayRepository {
  /** Returns the row WITHOUT essay_text (safe for all non-content operations). */
  async findByStudentId(studentId: number): Promise<EssayRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawEssayRow>(
        `SELECT TOP 1
           essay_id, student_id, essay_prompt,
           NULL AS essay_text,            -- NEVER returned
           word_count, essay_status, not_started_reason,
           reviewer_type, reviewer_confirmed,
           last_major_edit_at, reflection_lock_until,
           draft_saved_at, revised_at, reviewed_at, finalized_at,
           finalization_confirmed, previous_word_count,
           edit_session_count, repetition_detected,
           created_at, updated_at
           FROM ${STUDENT_ESSAYS_TABLE}
          WHERE student_id = @student_id;`,
      );
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  }

  /** Returns the row WITH essay_text — only used internally for content processing. */
  async findWithContentByStudentId(studentId: number): Promise<EssayRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawEssayRow>(
        `SELECT TOP 1 *
           FROM ${STUDENT_ESSAYS_TABLE}
          WHERE student_id = @student_id;`,
      );
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  }

  /** Creates or returns the existing essay row (idempotent). */
  async ensureExists(studentId: number): Promise<EssayRecord> {
    const existing = await this.findByStudentId(studentId);
    if (existing) return existing;

    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawEssayRow>(
        `DECLARE @OutputTable TABLE (
           essay_id INT, student_id INT, essay_prompt NVARCHAR(MAX),
           word_count INT, essay_status VARCHAR(20), not_started_reason VARCHAR(20),
           reviewer_type VARCHAR(10), reviewer_confirmed BIT,
           last_major_edit_at DATETIMEOFFSET, reflection_lock_until DATETIMEOFFSET,
           draft_saved_at DATETIMEOFFSET, revised_at DATETIMEOFFSET, reviewed_at DATETIMEOFFSET,
           finalized_at DATETIMEOFFSET, finalization_confirmed BIT,
           previous_word_count INT, edit_session_count INT,
           repetition_detected BIT, created_at DATETIMEOFFSET, updated_at DATETIMEOFFSET
         );

         INSERT INTO ${STUDENT_ESSAYS_TABLE} (student_id)
         OUTPUT
           INSERTED.essay_id, INSERTED.student_id, INSERTED.essay_prompt,
           INSERTED.word_count, INSERTED.essay_status, INSERTED.not_started_reason,
           INSERTED.reviewer_type, INSERTED.reviewer_confirmed,
           INSERTED.last_major_edit_at, INSERTED.reflection_lock_until,
           INSERTED.draft_saved_at, INSERTED.revised_at, INSERTED.reviewed_at,
           INSERTED.finalized_at, INSERTED.finalization_confirmed,
           INSERTED.previous_word_count, INSERTED.edit_session_count,
           INSERTED.repetition_detected, INSERTED.created_at, INSERTED.updated_at
         INTO @OutputTable
         VALUES (@student_id);

         SELECT *, NULL AS essay_text FROM @OutputTable;`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("Failed to create essay row");
    return mapRow(row);
  }

  async saveContent(studentId: number, data: SaveContentData): Promise<EssayRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id",           sql.Int,          studentId)
      .input("essay_text",           sql.NVarChar(sql.MAX), data.essay_text)
      .input("essay_prompt",         sql.NVarChar(sql.MAX), data.essay_prompt ?? null)
      .input("word_count",           sql.Int,          data.word_count)
      .input("repetition_detected",  sql.Bit,          data.repetition_detected ? 1 : 0)
      .input("previous_word_count",  sql.Int,          data.previous_word_count)
      .input("edit_session_count",   sql.Int,          data.edit_session_count)
      .input("last_major_edit_at",   sql.DateTimeOffset, data.last_major_edit_at)
      .input("reflection_lock_until",sql.DateTimeOffset, data.reflection_lock_until)
      .input("draft_saved_at",       sql.DateTimeOffset, data.draft_saved_at)
      .input("essay_status",         sql.VarChar(20),  data.essay_status)
      .input("not_started_reason",   sql.VarChar(20),  data.not_started_reason)
      .query<RawEssayRow>(
        `DECLARE @OutputTable TABLE (
           essay_id INT, student_id INT, essay_prompt NVARCHAR(MAX),
           word_count INT, essay_status VARCHAR(20), not_started_reason VARCHAR(20),
           reviewer_type VARCHAR(10), reviewer_confirmed BIT,
           last_major_edit_at DATETIMEOFFSET, reflection_lock_until DATETIMEOFFSET,
           draft_saved_at DATETIMEOFFSET, revised_at DATETIMEOFFSET, reviewed_at DATETIMEOFFSET,
           finalized_at DATETIMEOFFSET, finalization_confirmed BIT,
           previous_word_count INT, edit_session_count INT,
           repetition_detected BIT, created_at DATETIMEOFFSET, updated_at DATETIMEOFFSET
         );

         UPDATE ${STUDENT_ESSAYS_TABLE}
            SET essay_text            = @essay_text,
                essay_prompt          = COALESCE(@essay_prompt, essay_prompt),
                word_count            = @word_count,
                repetition_detected   = @repetition_detected,
                previous_word_count   = @previous_word_count,
                edit_session_count    = @edit_session_count,
                last_major_edit_at    = @last_major_edit_at,
                reflection_lock_until = @reflection_lock_until,
                draft_saved_at        = @draft_saved_at,
                essay_status          = @essay_status,
                not_started_reason    = @not_started_reason,
                updated_at            = SYSDATETIMEOFFSET()
         OUTPUT
           INSERTED.essay_id, INSERTED.student_id, INSERTED.essay_prompt,
           INSERTED.word_count, INSERTED.essay_status, INSERTED.not_started_reason,
           INSERTED.reviewer_type, INSERTED.reviewer_confirmed,
           INSERTED.last_major_edit_at, INSERTED.reflection_lock_until,
           INSERTED.draft_saved_at, INSERTED.revised_at, INSERTED.reviewed_at,
           INSERTED.finalized_at, INSERTED.finalization_confirmed,
           INSERTED.previous_word_count, INSERTED.edit_session_count,
           INSERTED.repetition_detected, INSERTED.created_at, INSERTED.updated_at
         INTO @OutputTable
          WHERE student_id = @student_id;

         SELECT *, NULL AS essay_text FROM @OutputTable;`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("saveContent returned no row");
    return mapRow(row);
  }

  async advanceStatus(studentId: number, data: AdvanceStatusData): Promise<EssayRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id",       sql.Int,           studentId)
      .input("essay_status",     sql.VarChar(20),   data.essay_status)
      .input("not_started_reason", sql.VarChar(20), data.not_started_reason)
      .input("draft_saved_at",   sql.DateTimeOffset, data.draft_saved_at    ?? null)
      .input("revised_at",       sql.DateTimeOffset, data.revised_at        ?? null)
      .input("reviewed_at",      sql.DateTimeOffset, data.reviewed_at       ?? null)
      .input("finalized_at",     sql.DateTimeOffset, data.finalized_at      ?? null)
      .query<RawEssayRow>(
        `DECLARE @OutputTable TABLE (
           essay_id INT, student_id INT, essay_prompt NVARCHAR(MAX),
           word_count INT, essay_status VARCHAR(20), not_started_reason VARCHAR(20),
           reviewer_type VARCHAR(10), reviewer_confirmed BIT,
           last_major_edit_at DATETIMEOFFSET, reflection_lock_until DATETIMEOFFSET,
           draft_saved_at DATETIMEOFFSET, revised_at DATETIMEOFFSET, reviewed_at DATETIMEOFFSET,
           finalized_at DATETIMEOFFSET, finalization_confirmed BIT,
           previous_word_count INT, edit_session_count INT,
           repetition_detected BIT, created_at DATETIMEOFFSET, updated_at DATETIMEOFFSET
         );

         UPDATE ${STUDENT_ESSAYS_TABLE}
            SET essay_status      = @essay_status,
                not_started_reason = @not_started_reason,
                draft_saved_at    = COALESCE(@draft_saved_at,  draft_saved_at),
                revised_at        = COALESCE(@revised_at,      revised_at),
                reviewed_at       = COALESCE(@reviewed_at,     reviewed_at),
                finalized_at      = COALESCE(@finalized_at,    finalized_at),
                updated_at        = SYSDATETIMEOFFSET()
         OUTPUT
           INSERTED.essay_id, INSERTED.student_id, INSERTED.essay_prompt,
           INSERTED.word_count, INSERTED.essay_status, INSERTED.not_started_reason,
           INSERTED.reviewer_type, INSERTED.reviewer_confirmed,
           INSERTED.last_major_edit_at, INSERTED.reflection_lock_until,
           INSERTED.draft_saved_at, INSERTED.revised_at, INSERTED.reviewed_at,
           INSERTED.finalized_at, INSERTED.finalization_confirmed,
           INSERTED.previous_word_count, INSERTED.edit_session_count,
           INSERTED.repetition_detected, INSERTED.created_at, INSERTED.updated_at
         INTO @OutputTable
          WHERE student_id = @student_id;

         SELECT *, NULL AS essay_text FROM @OutputTable;`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("advanceStatus returned no row");
    return mapRow(row);
  }

  async confirmReviewer(studentId: number, data: ConfirmReviewerData): Promise<EssayRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id",        sql.Int,        studentId)
      .input("reviewer_type",     sql.VarChar(10), data.reviewer_type)
      .input("reviewer_confirmed",sql.Bit,         data.reviewer_confirmed ? 1 : 0)
      .query<RawEssayRow>(
        `DECLARE @OutputTable TABLE (
           essay_id INT, student_id INT, essay_prompt NVARCHAR(MAX),
           word_count INT, essay_status VARCHAR(20), not_started_reason VARCHAR(20),
           reviewer_type VARCHAR(10), reviewer_confirmed BIT,
           last_major_edit_at DATETIMEOFFSET, reflection_lock_until DATETIMEOFFSET,
           draft_saved_at DATETIMEOFFSET, revised_at DATETIMEOFFSET, reviewed_at DATETIMEOFFSET,
           finalized_at DATETIMEOFFSET, finalization_confirmed BIT,
           previous_word_count INT, edit_session_count INT,
           repetition_detected BIT, created_at DATETIMEOFFSET, updated_at DATETIMEOFFSET
         );

         UPDATE ${STUDENT_ESSAYS_TABLE}
            SET reviewer_type      = @reviewer_type,
                reviewer_confirmed = @reviewer_confirmed,
                updated_at         = SYSDATETIMEOFFSET()
         OUTPUT
           INSERTED.essay_id, INSERTED.student_id, INSERTED.essay_prompt,
           INSERTED.word_count, INSERTED.essay_status, INSERTED.not_started_reason,
           INSERTED.reviewer_type, INSERTED.reviewer_confirmed,
           INSERTED.last_major_edit_at, INSERTED.reflection_lock_until,
           INSERTED.draft_saved_at, INSERTED.revised_at, INSERTED.reviewed_at,
           INSERTED.finalized_at, INSERTED.finalization_confirmed,
           INSERTED.previous_word_count, INSERTED.edit_session_count,
           INSERTED.repetition_detected, INSERTED.created_at, INSERTED.updated_at
         INTO @OutputTable
          WHERE student_id = @student_id;

         SELECT *, NULL AS essay_text FROM @OutputTable;`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("confirmReviewer returned no row");
    return mapRow(row);
  }

  async finalize(studentId: number, data: FinalizeData): Promise<EssayRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id",             sql.Int,           studentId)
      .input("finalization_confirmed", sql.Bit,           data.finalization_confirmed ? 1 : 0)
      .input("essay_status",           sql.VarChar(20),   data.essay_status)
      .input("finalized_at",           sql.DateTimeOffset, data.finalized_at)
      .query<RawEssayRow>(
        `DECLARE @OutputTable TABLE (
           essay_id INT, student_id INT, essay_prompt NVARCHAR(MAX),
           word_count INT, essay_status VARCHAR(20), not_started_reason VARCHAR(20),
           reviewer_type VARCHAR(10), reviewer_confirmed BIT,
           last_major_edit_at DATETIMEOFFSET, reflection_lock_until DATETIMEOFFSET,
           draft_saved_at DATETIMEOFFSET, revised_at DATETIMEOFFSET, reviewed_at DATETIMEOFFSET,
           finalized_at DATETIMEOFFSET, finalization_confirmed BIT,
           previous_word_count INT, edit_session_count INT,
           repetition_detected BIT, created_at DATETIMEOFFSET, updated_at DATETIMEOFFSET
         );

         UPDATE ${STUDENT_ESSAYS_TABLE}
            SET finalization_confirmed = @finalization_confirmed,
                essay_status           = @essay_status,
                finalized_at           = @finalized_at,
                not_started_reason     = NULL,
                updated_at             = SYSDATETIMEOFFSET()
         OUTPUT
           INSERTED.essay_id, INSERTED.student_id, INSERTED.essay_prompt,
           INSERTED.word_count, INSERTED.essay_status, INSERTED.not_started_reason,
           INSERTED.reviewer_type, INSERTED.reviewer_confirmed,
           INSERTED.last_major_edit_at, INSERTED.reflection_lock_until,
           INSERTED.draft_saved_at, INSERTED.revised_at, INSERTED.reviewed_at,
           INSERTED.finalized_at, INSERTED.finalization_confirmed,
           INSERTED.previous_word_count, INSERTED.edit_session_count,
           INSERTED.repetition_detected, INSERTED.created_at, INSERTED.updated_at
         INTO @OutputTable
          WHERE student_id = @student_id;

         SELECT *, NULL AS essay_text FROM @OutputTable;`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("finalize returned no row");
    return mapRow(row);
  }
}
