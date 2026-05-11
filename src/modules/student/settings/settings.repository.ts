import { sql, getPool } from "../../../db/client.js";
import { FEEDBACK_SUBMISSIONS_TABLE } from "../../../db/schema/feedback-submissions.js";
import { STUDENTS_TABLE } from "../../../db/schema/students.js";
import type { FeedbackSubmission, FeedbackType } from "./settings.types.js";

export class SettingsRepository {
  async createFeedback(data: {
    user_id: number;
    school_id: number | null;
    feedback_type: FeedbackType;
    message: string;
    screenshot_url?: string;
    contact_consent: boolean;
    user_role: string;
    page_or_screen?: string;
    app_version?: string;
    device_type?: string;
    platform?: string;
  }): Promise<FeedbackSubmission> {
    const pool = await getPool();
    const query = `
      INSERT INTO ${FEEDBACK_SUBMISSIONS_TABLE} (
        submitter_id, school_id, feedback_type, message, screenshot_url,
        contact_consent, submitter_role, page_or_screen, app_version,
        device_type, platform, status
      )
      OUTPUT inserted.*
      VALUES (
        @submitter_id, @school_id, @feedback_type, @message, @screenshot_url,
        @contact_consent, @submitter_role, @page_or_screen, @app_version,
        @device_type, @platform, 'new'
      )
    `;
    const result = await pool.request()
      .input("submitter_id", sql.Int, data.user_id)
      .input("school_id", sql.Int, data.school_id)
      .input("feedback_type", sql.VarChar(50), data.feedback_type)
      .input("message", sql.NVarChar(sql.MAX), data.message)
      .input("screenshot_url", sql.VarChar(500), data.screenshot_url || null)
      .input("contact_consent", sql.Bit, data.contact_consent)
      .input("submitter_role", sql.VarChar(20), data.user_role)
      .input("page_or_screen", sql.VarChar(100), data.page_or_screen || null)
      .input("app_version", sql.VarChar(50), data.app_version || null)
      .input("device_type", sql.VarChar(50), data.device_type || null)
      .input("platform", sql.VarChar(20), data.platform || null)
      .query<FeedbackSubmission>(query);
    
    return result.recordset[0];
  }

  async softDeleteAccount(studentId: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input("student_id", sql.Int, studentId)
      .query(`
        UPDATE ${STUDENTS_TABLE}
        SET is_active = 0,
            updated_at = SYSDATETIMEOFFSET()
        WHERE student_id = @student_id
      `);
  }
}
