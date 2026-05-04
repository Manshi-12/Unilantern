import { sql, getPool } from "../../../db/client.js";
import { STUDENTS_TABLE } from "../../../db/schema/students.js";
import { OTP_VERIFICATIONS_TABLE } from "../../../db/schema/otp-verifications.js";
import { STUDENT_PROFILES_TABLE } from "../../../db/schema/student-profiles.js";
import { STUDENT_CONSENTS_TABLE } from "../../../db/schema/student-consents.js";
import { EXTRACURRICULAR_ACTIVITIES_TABLE } from "../../../db/schema/extracurricular-activities.js";
import type {
  CreateOtpData,
  CreateStudentData,
  OtpRecord,
  StudentProfileRecord,
  StudentRecord,
  UpdateStudentProfileData,
  ExtracurricularRecord,
  CreateExtracurricularData,
  UpdateExtracurricularData,
  ExtracurricularReorderData,
} from "./student.types.js";

type RawStudentRow = {
  student_id: number;
  school_id: number | null;
  role: "student";
  account_status: "independent" | "school_linked";
  is_active: boolean;
  phone_number: string;
  phone_verified: boolean;
  email: string | null;
  full_name: string;
  invite_token_used: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type RawOtpRow = {
  otp_id: number;
  phone_number: string;
  purpose: "signup" | "login" | "phone_change";
  otp_code_hash: string;
  is_used: boolean;
  attempts: number;
  expires_at: Date;
  created_at: Date;
};

function mapStudent(row: RawStudentRow): StudentRecord {
  return { ...row };
}

function mapOtp(row: RawOtpRow): OtpRecord {
  return { ...row };
}

type RawExtracurricularRow = {
  activity_id: number;
  student_id: number;
  activity_name: string;
  activity_type: string;
  years_involved: string;
  involvement_level: string;
  activity_description: string;
  impact_text: string;
  impact_level: string;
  hours_per_week: string;
  experience_duration_weeks: number | null;
  selective_acceptance_toggle: boolean;
  external_org_toggle: boolean;
  travel_or_residency_toggle: boolean;
  people_impacted: number;
  funds_raised: number;
  users_acquired: number;
  hours_delivered: number;
  competition_top_10_pct_toggle: boolean;
  finalist_or_winner_toggle: boolean;
  publication_or_presented_toggle: boolean;
  policy_or_partnership_toggle: boolean;
  structured_deliverable_toggle: boolean;
  language_or_skill_cert_toggle: boolean;
  formal_selection_toggle: boolean;
  documented_real_world_output: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
};

function mapExtracurricular(row: RawExtracurricularRow): ExtracurricularRecord {
  return {
    activity_id: row.activity_id,
    student_id: row.student_id,
    activity_name: row.activity_name,
    activity_type: row.activity_type as ExtracurricularRecord['activity_type'],
    years_involved: row.years_involved as ExtracurricularRecord['years_involved'],
    involvement_level: row.involvement_level as ExtracurricularRecord['involvement_level'],
    activity_description: row.activity_description,
    impact_text: row.impact_text,
    impact_level: row.impact_level as ExtracurricularRecord['impact_level'],
    hours_per_week: row.hours_per_week as ExtracurricularRecord['hours_per_week'],
    experience_duration_weeks: row.experience_duration_weeks,
    selective_acceptance_toggle: row.selective_acceptance_toggle,
    external_org_toggle: row.external_org_toggle,
    travel_or_residency_toggle: row.travel_or_residency_toggle,
    people_impacted: row.people_impacted,
    funds_raised: row.funds_raised,
    users_acquired: row.users_acquired,
    hours_delivered: row.hours_delivered,
    competition_top_10_pct_toggle: row.competition_top_10_pct_toggle,
    finalist_or_winner_toggle: row.finalist_or_winner_toggle,
    publication_or_presented_toggle: row.publication_or_presented_toggle,
    policy_or_partnership_toggle: row.policy_or_partnership_toggle,
    structured_deliverable_toggle: row.structured_deliverable_toggle,
    language_or_skill_cert_toggle: row.language_or_skill_cert_toggle,
    formal_selection_toggle: row.formal_selection_toggle,
    documented_real_world_output: row.documented_real_world_output,
    display_order: row.display_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class StudentRepository {
  async findByPhone(phone: string): Promise<StudentRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("phone", sql.VarChar(25), phone)
      .query<RawStudentRow>(
        `SELECT TOP 1 * FROM ${STUDENTS_TABLE} WHERE phone_number = @phone`,
      );
    const row = result.recordset[0];
    return row ? mapStudent(row) : null;
  }

  async findByEmail(email: string): Promise<StudentRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", sql.VarChar(320), email)
      .query<RawStudentRow>(
        `SELECT TOP 1 * FROM ${STUDENTS_TABLE} WHERE email = @email`,
      );
    const row = result.recordset[0];
    return row ? mapStudent(row) : null;
  }

  async findById(studentId: number): Promise<StudentRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawStudentRow>(
        `SELECT TOP 1 * FROM ${STUDENTS_TABLE} WHERE student_id = @student_id`,
      );
    const row = result.recordset[0];
    return row ? mapStudent(row) : null;
  }

  async getStudentProfileByStudentId(studentId: number): Promise<StudentProfileRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawStudentRow & {
        grade: number | null;
        graduation_year: number;
        high_school_name: string | null;
        state_of_residence: string | null;
        profile_complete: boolean;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT TOP 1
            s.student_id,
            s.full_name,
            s.account_status,
            s.school_id,
            sp.grade,
            sp.graduation_year,
            sp.high_school_name,
            sp.state_of_residence,
            sp.profile_complete,
            sp.created_at,
            sp.updated_at
          FROM ${STUDENTS_TABLE} s
          INNER JOIN ${STUDENT_PROFILES_TABLE} sp
            ON s.student_id = sp.student_id
          WHERE s.student_id = @student_id`,
      );
    const row = result.recordset[0];
    return row
      ? {
          student_id: row.student_id,
          full_name: row.full_name,
          account_status: row.account_status,
          school_id: row.school_id,
          grade: row.grade,
          graduation_year: row.graduation_year,
          high_school_name: row.high_school_name,
          state_of_residence: row.state_of_residence,
          profile_complete: row.profile_complete,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }
      : null;
  }

  async updateStudentFullName(studentId: number, fullName: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("full_name", sql.VarChar(200), fullName)
      .query(
        `UPDATE ${STUDENTS_TABLE}
            SET full_name = @full_name,
                updated_at = SYSDATETIMEOFFSET()
          WHERE student_id = @student_id;`,
      );

    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query(
        `UPDATE ${STUDENT_PROFILES_TABLE}
            SET updated_at = SYSDATETIMEOFFSET()
          WHERE student_id = @student_id;`,
      );
  }

  async updateStudentProfile(studentId: number, data: UpdateStudentProfileData): Promise<void> {
    const pool = await getPool();
    const setClauses: string[] = [];
    const request = pool.request().input("student_id", sql.Int, studentId);

    if (data.grade !== undefined) {
      request.input("grade", sql.SmallInt, data.grade);
      setClauses.push("grade = @grade");
    }
    if (data.graduation_year !== undefined) {
      request.input("graduation_year", sql.SmallInt, data.graduation_year);
      setClauses.push("graduation_year = @graduation_year");
    }
    if (data.high_school_name !== undefined) {
      request.input("high_school_name", sql.VarChar(300), data.high_school_name);
      setClauses.push("high_school_name = @high_school_name");
    }
    if (data.state_of_residence !== undefined) {
      request.input("state_of_residence", sql.VarChar(100), data.state_of_residence);
      setClauses.push("state_of_residence = @state_of_residence");
    }

    if (setClauses.length === 0) {
      return;
    }

    setClauses.push("updated_at = SYSDATETIMEOFFSET()");

    await request.query(
      `UPDATE ${STUDENT_PROFILES_TABLE}
          SET ${setClauses.join(", ")}
        WHERE student_id = @student_id;`,
    );
  }

  async getExtracurricularsByStudentId(
    studentId: number,
    limit: number,
    cursor?: string
  ): Promise<{ activities: ExtracurricularRecord[]; hasMore: boolean; nextCursor: string | null }> {
    const pool = await getPool();
    const request = pool.request().input("student_id", sql.Int, studentId).input("limit", sql.Int, limit + 1);

    let whereClause = "WHERE student_id = @student_id";
    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      const [displayOrder, activityId] = decodedCursor.split(':').map(Number);
      request.input("cursor_display_order", sql.SmallInt, displayOrder);
      request.input("cursor_activity_id", sql.Int, activityId);
      whereClause += " AND (display_order > @cursor_display_order OR (display_order = @cursor_display_order AND activity_id > @cursor_activity_id))";
    }

    const result = await request.query<RawExtracurricularRow>(
      `SELECT TOP (@limit) * FROM ${EXTRACURRICULAR_ACTIVITIES_TABLE}
       ${whereClause}
       ORDER BY display_order ASC, activity_id ASC;`,
    );

    const rows = result.recordset;
    const hasMore = rows.length > limit;
    const activities = hasMore ? rows.slice(0, limit) : rows;
    const mappedActivities = activities.map(mapExtracurricular);

    let nextCursor: string | null = null;
    if (hasMore && activities.length > 0) {
      const lastActivity = activities[activities.length - 1];
      nextCursor = Buffer.from(`${lastActivity.display_order}:${lastActivity.activity_id}`).toString('base64');
    }

    return { activities: mappedActivities, hasMore, nextCursor };
  }

  async getExtracurricularById(activityId: number): Promise<ExtracurricularRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("activity_id", sql.Int, activityId)
      .query<RawExtracurricularRow>(
        `SELECT TOP 1 * FROM ${EXTRACURRICULAR_ACTIVITIES_TABLE} WHERE activity_id = @activity_id;`,
      );
    const row = result.recordset[0];
    return row ? mapExtracurricular(row) : null;
  }

  async createExtracurricular(data: CreateExtracurricularData): Promise<ExtracurricularRecord> {
    const pool = await getPool();

    // Get next display_order
    const maxOrderResult = await pool
      .request()
      .input("student_id", sql.Int, data.student_id)
      .query<{ max_order: number }>(
        `SELECT ISNULL(MAX(display_order), 0) + 1 AS max_order FROM ${EXTRACURRICULAR_ACTIVITIES_TABLE} WHERE student_id = @student_id;`,
      );
    const displayOrder = maxOrderResult.recordset[0]?.max_order ?? 1;

    const result = await pool
      .request()
      .input("student_id", sql.Int, data.student_id)
      .input("activity_name", sql.VarChar(250), data.activity_name)
      .input("activity_type", sql.VarChar(10), data.activity_type)
      .input("years_involved", sql.VarChar(15), data.years_involved)
      .input("involvement_level", sql.VarChar(20), data.involvement_level)
      .input("activity_description", sql.VarChar(400), data.activity_description)
      .input("impact_text", sql.VarChar(300), data.impact_text)
      .input("impact_level", sql.VarChar(20), data.impact_level)
      .input("hours_per_week", sql.VarChar(10), data.hours_per_week)
      .input("experience_duration_weeks", sql.SmallInt, data.experience_duration_weeks ?? null)
      .input("selective_acceptance_toggle", sql.Bit, data.selective_acceptance_toggle ?? false)
      .input("external_org_toggle", sql.Bit, data.external_org_toggle ?? false)
      .input("travel_or_residency_toggle", sql.Bit, data.travel_or_residency_toggle ?? false)
      .input("people_impacted", sql.Int, data.people_impacted ?? 0)
      .input("funds_raised", sql.Int, data.funds_raised ?? 0)
      .input("users_acquired", sql.Int, data.users_acquired ?? 0)
      .input("hours_delivered", sql.Int, data.hours_delivered ?? 0)
      .input("competition_top_10_pct_toggle", sql.Bit, data.competition_top_10_pct_toggle ?? false)
      .input("finalist_or_winner_toggle", sql.Bit, data.finalist_or_winner_toggle ?? false)
      .input("publication_or_presented_toggle", sql.Bit, data.publication_or_presented_toggle ?? false)
      .input("policy_or_partnership_toggle", sql.Bit, data.policy_or_partnership_toggle ?? false)
      .input("structured_deliverable_toggle", sql.Bit, data.structured_deliverable_toggle ?? false)
      .input("language_or_skill_cert_toggle", sql.Bit, data.language_or_skill_cert_toggle ?? false)
      .input("formal_selection_toggle", sql.Bit, data.formal_selection_toggle ?? false)
      .input("documented_real_world_output", sql.Bit, data.documented_real_world_output_toggle ?? false)
      .input("display_order", sql.SmallInt, displayOrder)
      .query<RawExtracurricularRow>(
        `INSERT INTO ${EXTRACURRICULAR_ACTIVITIES_TABLE}
          (student_id, activity_name, activity_type, years_involved, involvement_level,
           activity_description, impact_text, impact_level, hours_per_week,
           experience_duration_weeks, selective_acceptance_toggle, external_org_toggle,
           travel_or_residency_toggle, people_impacted, funds_raised, users_acquired,
           hours_delivered, competition_top_10_pct_toggle, finalist_or_winner_toggle,
           publication_or_presented_toggle, policy_or_partnership_toggle,
           structured_deliverable_toggle, language_or_skill_cert_toggle,
           formal_selection_toggle, documented_real_world_output, display_order)
         OUTPUT INSERTED.*
         VALUES
          (@student_id, @activity_name, @activity_type, @years_involved, @involvement_level,
           @activity_description, @impact_text, @impact_level, @hours_per_week,
           @experience_duration_weeks, @selective_acceptance_toggle, @external_org_toggle,
           @travel_or_residency_toggle, @people_impacted, @funds_raised, @users_acquired,
           @hours_delivered, @competition_top_10_pct_toggle, @finalist_or_winner_toggle,
           @publication_or_presented_toggle, @policy_or_partnership_toggle,
           @structured_deliverable_toggle, @language_or_skill_cert_toggle,
           @formal_selection_toggle, @documented_real_world_output, @display_order);`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("Failed to insert extracurricular activity");
    return mapExtracurricular(row);
  }

  async updateExtracurricular(activityId: number, data: UpdateExtracurricularData): Promise<void> {
    const pool = await getPool();
    const setClauses: string[] = [];
    const request = pool.request().input("activity_id", sql.Int, activityId);

    if (data.activity_name !== undefined) {
      request.input("activity_name", sql.VarChar(250), data.activity_name);
      setClauses.push("activity_name = @activity_name");
    }
    if (data.activity_type !== undefined) {
      request.input("activity_type", sql.VarChar(10), data.activity_type);
      setClauses.push("activity_type = @activity_type");
    }
    if (data.years_involved !== undefined) {
      request.input("years_involved", sql.VarChar(15), data.years_involved);
      setClauses.push("years_involved = @years_involved");
    }
    if (data.involvement_level !== undefined) {
      request.input("involvement_level", sql.VarChar(20), data.involvement_level);
      setClauses.push("involvement_level = @involvement_level");
    }
    if (data.activity_description !== undefined) {
      request.input("activity_description", sql.VarChar(400), data.activity_description);
      setClauses.push("activity_description = @activity_description");
    }
    if (data.impact_text !== undefined) {
      request.input("impact_text", sql.VarChar(300), data.impact_text);
      setClauses.push("impact_text = @impact_text");
    }
    if (data.impact_level !== undefined) {
      request.input("impact_level", sql.VarChar(20), data.impact_level);
      setClauses.push("impact_level = @impact_level");
    }
    if (data.hours_per_week !== undefined) {
      request.input("hours_per_week", sql.VarChar(10), data.hours_per_week);
      setClauses.push("hours_per_week = @hours_per_week");
    }
    if (data.experience_duration_weeks !== undefined) {
      request.input("experience_duration_weeks", sql.SmallInt, data.experience_duration_weeks);
      setClauses.push("experience_duration_weeks = @experience_duration_weeks");
    }
    if (data.selective_acceptance_toggle !== undefined) {
      request.input("selective_acceptance_toggle", sql.Bit, data.selective_acceptance_toggle);
      setClauses.push("selective_acceptance_toggle = @selective_acceptance_toggle");
    }
    if (data.external_org_toggle !== undefined) {
      request.input("external_org_toggle", sql.Bit, data.external_org_toggle);
      setClauses.push("external_org_toggle = @external_org_toggle");
    }
    if (data.travel_or_residency_toggle !== undefined) {
      request.input("travel_or_residency_toggle", sql.Bit, data.travel_or_residency_toggle);
      setClauses.push("travel_or_residency_toggle = @travel_or_residency_toggle");
    }
    if (data.people_impacted !== undefined) {
      request.input("people_impacted", sql.Int, data.people_impacted);
      setClauses.push("people_impacted = @people_impacted");
    }
    if (data.funds_raised !== undefined) {
      request.input("funds_raised", sql.Int, data.funds_raised);
      setClauses.push("funds_raised = @funds_raised");
    }
    if (data.users_acquired !== undefined) {
      request.input("users_acquired", sql.Int, data.users_acquired);
      setClauses.push("users_acquired = @users_acquired");
    }
    if (data.hours_delivered !== undefined) {
      request.input("hours_delivered", sql.Int, data.hours_delivered);
      setClauses.push("hours_delivered = @hours_delivered");
    }
    if (data.competition_top_10_pct_toggle !== undefined) {
      request.input("competition_top_10_pct_toggle", sql.Bit, data.competition_top_10_pct_toggle);
      setClauses.push("competition_top_10_pct_toggle = @competition_top_10_pct_toggle");
    }
    if (data.finalist_or_winner_toggle !== undefined) {
      request.input("finalist_or_winner_toggle", sql.Bit, data.finalist_or_winner_toggle);
      setClauses.push("finalist_or_winner_toggle = @finalist_or_winner_toggle");
    }
    if (data.publication_or_presented_toggle !== undefined) {
      request.input("publication_or_presented_toggle", sql.Bit, data.publication_or_presented_toggle);
      setClauses.push("publication_or_presented_toggle = @publication_or_presented_toggle");
    }
    if (data.policy_or_partnership_toggle !== undefined) {
      request.input("policy_or_partnership_toggle", sql.Bit, data.policy_or_partnership_toggle);
      setClauses.push("policy_or_partnership_toggle = @policy_or_partnership_toggle");
    }
    if (data.structured_deliverable_toggle !== undefined) {
      request.input("structured_deliverable_toggle", sql.Bit, data.structured_deliverable_toggle);
      setClauses.push("structured_deliverable_toggle = @structured_deliverable_toggle");
    }
    if (data.language_or_skill_cert_toggle !== undefined) {
      request.input("language_or_skill_cert_toggle", sql.Bit, data.language_or_skill_cert_toggle);
      setClauses.push("language_or_skill_cert_toggle = @language_or_skill_cert_toggle");
    }
    if (data.formal_selection_toggle !== undefined) {
      request.input("formal_selection_toggle", sql.Bit, data.formal_selection_toggle);
      setClauses.push("formal_selection_toggle = @formal_selection_toggle");
    }
    if (data.documented_real_world_output_toggle !== undefined) {
      request.input("documented_real_world_output", sql.Bit, data.documented_real_world_output_toggle);
      setClauses.push("documented_real_world_output = @documented_real_world_output");
    }

    if (setClauses.length === 0) {
      return;
    }

    setClauses.push("updated_at = SYSDATETIMEOFFSET()");

    await request.query(
      `UPDATE ${EXTRACURRICULAR_ACTIVITIES_TABLE}
          SET ${setClauses.join(", ")}
        WHERE activity_id = @activity_id;`,
    );
  }

  async deleteExtracurricular(activityId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("activity_id", sql.Int, activityId)
      .query(
        `DELETE FROM ${EXTRACURRICULAR_ACTIVITIES_TABLE} WHERE activity_id = @activity_id;`,
      );
  }

  async reorderExtracurriculars(studentId: number, orders: ExtracurricularReorderData[]): Promise<number> {
    const pool = await getPool();
    let updatedCount = 0;

    for (const order of orders) {
      const result = await pool
        .request()
        .input("activity_id", sql.Int, order.activity_id)
        .input("student_id", sql.Int, studentId)
        .input("display_order", sql.SmallInt, order.display_order)
        .query(
          `UPDATE ${EXTRACURRICULAR_ACTIVITIES_TABLE}
              SET display_order = @display_order, updated_at = SYSDATETIMEOFFSET()
            WHERE activity_id = @activity_id AND student_id = @student_id;`,
        );
      updatedCount += result.rowsAffected[0] ?? 0;
    }

    return updatedCount;
  }

  async validateExtracurricularOwnership(activityId: number, studentId: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("activity_id", sql.Int, activityId)
      .input("student_id", sql.Int, studentId)
      .query<{ count: number }>(
        `SELECT COUNT(*) AS count FROM ${EXTRACURRICULAR_ACTIVITIES_TABLE}
         WHERE activity_id = @activity_id AND student_id = @student_id;`,
      );
    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async createStudent(data: CreateStudentData): Promise<StudentRecord> {
    const pool = await getPool();

    // Insert student row
    const result = await pool
      .request()
      .input("phone_number", sql.VarChar(25), data.phone_number)
      .input("email", sql.VarChar(320), data.email)
      .input("full_name", sql.VarChar(200), data.full_name)
      .input("is_active", sql.Bit, data.is_active)
      .input("phone_verified", sql.Bit, data.phone_verified)
      .input("account_status", sql.VarChar(15), data.account_status)
      .input("school_id", sql.Int, data.school_id)
      .input("invite_token_used", sql.VarChar(500), data.invite_token_used)
      .query<RawStudentRow>(
        `INSERT INTO ${STUDENTS_TABLE}
          (phone_number, email, full_name, is_active, phone_verified, account_status, school_id, invite_token_used)
         OUTPUT INSERTED.*
         VALUES
          (@phone_number, @email, @full_name, @is_active, @phone_verified, @account_status, @school_id, @invite_token_used);`,
      );
    const row = result.recordset[0];
    if (!row) throw new Error("Failed to insert student row");
    const student = mapStudent(row);

    // Insert student_profile row — graduation_year, DOB, school info
    await pool
      .request()
      .input("student_id", sql.Int, student.student_id)
      .input("graduation_year", sql.SmallInt, data.graduation_year)
      .input("date_of_birth", sql.Date, data.date_of_birth)
      .input("high_school_name", sql.VarChar(300), data.high_school_name)
      .input("state_of_residence", sql.VarChar(100), data.state_of_residence)
      .query(
        `INSERT INTO ${STUDENT_PROFILES_TABLE}
          (student_id, graduation_year, date_of_birth, high_school_name, state_of_residence)
         VALUES
          (@student_id, @graduation_year, @date_of_birth, @high_school_name, @state_of_residence);`,
      );

    // Insert consent rows derived from registration flags
    const consents: { type: string; status: string }[] = [
      { type: "age_13plus", status: data.confirms_age_13_plus ? "granted" : "revoked" },
      { type: "parental_13_17", status: data.confirms_parental_permission ? "granted" : "revoked" },
      { type: "college", status: data.college_data_share ? "granted" : "revoked" },
    ];

    for (const c of consents) {
      await pool
        .request()
        .input("student_id", sql.Int, student.student_id)
        .input("consent_type", sql.VarChar(60), c.type)
        .input("status", sql.VarChar(20), c.status)
        .query(
          `INSERT INTO ${STUDENT_CONSENTS_TABLE}
            (student_id, consent_type, status, source)
           VALUES
            (@student_id, @consent_type, @status, 'signup');`,
        );
    }

    return student;
  }

  async updateLastLogin(studentId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query(
        `UPDATE ${STUDENTS_TABLE}
            SET last_login_at = SYSDATETIMEOFFSET(),
                updated_at    = SYSDATETIMEOFFSET()
          WHERE student_id = @student_id;`,
      );
  }

  async updatePhoneVerified(phone: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("phone", sql.VarChar(25), phone)
      .query(
        `UPDATE ${STUDENTS_TABLE}
            SET phone_verified = 1,
                updated_at     = SYSDATETIMEOFFSET()
          WHERE phone_number = @phone;`,
      );
  }
}

export class OtpRepository {
  async createOtp(data: CreateOtpData): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("phone_number", sql.VarChar(25), data.phone_number)
      .input("purpose", sql.VarChar(30), data.purpose)
      .input("otp_code_hash", sql.VarChar(255), data.otp_code_hash)
      .input("expires_at", sql.DateTimeOffset, data.expires_at)
      .query(
        `INSERT INTO ${OTP_VERIFICATIONS_TABLE}
            (phone_number, purpose, otp_code_hash, expires_at)
         VALUES
            (@phone_number, @purpose, @otp_code_hash, @expires_at);`,
      );
  }

  async findLatestValidOtp(
    phone: string,
    purpose: string,
  ): Promise<OtpRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("phone", sql.VarChar(25), phone)
      .input("purpose", sql.VarChar(30), purpose)
      .query<RawOtpRow>(
        `SELECT TOP 1 *
           FROM ${OTP_VERIFICATIONS_TABLE}
          WHERE phone_number = @phone
            AND purpose = @purpose
            AND is_used = 0
          ORDER BY otp_id DESC;`,
      );
    const row = result.recordset[0];
    return row ? mapOtp(row) : null;
  }

  async incrementAttempts(otpId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("otp_id", sql.Int, otpId)
      .query(
        `UPDATE ${OTP_VERIFICATIONS_TABLE}
            SET attempts = attempts + 1
          WHERE otp_id = @otp_id;`,
      );
  }

  async markUsed(otpId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("otp_id", sql.Int, otpId)
      .query(
        `UPDATE ${OTP_VERIFICATIONS_TABLE}
            SET is_used = 1
          WHERE otp_id = @otp_id;`,
      );
  }

  async invalidatePreviousOtps(phone: string, purpose: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("phone", sql.VarChar(25), phone)
      .input("purpose", sql.VarChar(30), purpose)
      .query(
        `UPDATE ${OTP_VERIFICATIONS_TABLE}
            SET is_used = 1
          WHERE phone_number = @phone
            AND purpose = @purpose
            AND is_used = 0;`,
      );
  }
}
