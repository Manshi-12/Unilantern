import { sql, getPool } from "../../db/client.js";
import { ANALYTICS_EVENTS_TABLE } from "../../db/schema/analytics-events.js";
import { STUDENT_PROFILES_TABLE } from "../../db/schema/student-profiles.js";
import type { AnalyticsEventRecord } from "./analytics.types.js";

export class AnalyticsRepository {
  async getStudentGrade(studentId: number): Promise<number | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input("student_id", sql.Int, studentId)
      .query<{ grade: number | null }>(`
        SELECT TOP 1 grade
        FROM ${STUDENT_PROFILES_TABLE}
        WHERE student_id = @student_id;
      `);

    return result.recordset[0]?.grade ?? null;
  }

  async insertEvents(events: AnalyticsEventRecord[]): Promise<number> {
    if (events.length === 0) return 0;

    const pool = await getPool();
    let inserted = 0;

    for (const event of events) {
      const result = await pool.request()
        .input("actor_id", sql.Int, event.actor_id)
        .input("actor_role", sql.VarChar(20), event.actor_role)
        .input("school_id", sql.Int, event.school_id)
        .input("event_name", sql.VarChar(60), event.event_name)
        .input("tab_name", sql.VarChar(60), event.tab_name)
        .input("grade_level", sql.SmallInt, event.grade_level)
        .input("platform", sql.VarChar(20), event.platform)
        .input("session_id", sql.VarChar(150), event.session_id)
        .input("properties", sql.NVarChar(sql.MAX), JSON.stringify(event.properties))
        .query(`
          INSERT INTO ${ANALYTICS_EVENTS_TABLE}
            (actor_id, actor_role, school_id, event_name, tab_name, grade_level, platform, session_id, properties)
          VALUES
            (@actor_id, @actor_role, @school_id, @event_name, @tab_name, @grade_level, @platform, @session_id, @properties);
        `);

      inserted += result.rowsAffected[0] ?? 0;
    }

    return inserted;
  }
}
