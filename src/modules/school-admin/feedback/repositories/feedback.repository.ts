import { getPool, sql }              from '../../../../database/db';
import {
  CreateFeedbackInput,
  IFeedbackRepository,
} from '../interfaces/feedback.interface';

export class FeedbackRepository implements IFeedbackRepository {

  async insertFeedback(data: CreateFeedbackInput): Promise<{ feedback_id: number }> {
    const pool = await getPool();
    const result = await pool.request()
      .input('admin_id',      sql.Int,           data.admin_id)
      .input('school_id',     sql.Int,           data.school_id)
      .input('type',          sql.VarChar(30),   data.type)
      .input('message',       sql.NVarChar(sql.MAX), data.message)
      .input('allow_contact', sql.Bit,           data.allow_contact ? 1 : 0)
      .input('page_name',     sql.VarChar(255),  data.page_name)
      .input('app_version',   sql.VarChar(50),   data.app_version)
      .input('device_type',   sql.VarChar(100),  data.device_type)
      .query(`
        INSERT INTO admin_feedback
          (admin_id, school_id, type, message, allow_contact,
           page_name, app_version, device_type, status, created_at)
        OUTPUT INSERTED.feedback_id
        VALUES
          (@admin_id, @school_id, @type, @message, @allow_contact,
           @page_name, @app_version, @device_type, 'new', GETDATE()) 
      `);
    return { feedback_id: result.recordset[0].feedback_id };
  }
}




