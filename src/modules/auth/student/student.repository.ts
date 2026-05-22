import { sql, getPool } from "../../../db/client.js";
import { STUDENTS_TABLE } from "../../../db/schema/students.js";
import { OTP_VERIFICATIONS_TABLE } from "../../../db/schema/otp-verifications.js";
import { STUDENT_PROFILES_TABLE } from "../../../db/schema/student-profiles.js";
import { STUDENT_CONSENTS_TABLE } from "../../../db/schema/student-consents.js";
import type {
  CreateOtpData,
  CreateStudentData,
  OtpRecord,
  StudentRecord,
} from "./student.types.js";

const INVITE_TOKENS_TABLE = "invite_tokens";
const SCHOOLS_TABLE = "schools";

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

type RawInviteTokenRow = {
  school_id: number;
  school_name: string | null;
};

function mapStudent(row: RawStudentRow): StudentRecord {
  return { ...row };
}

function mapOtp(row: RawOtpRow): OtpRecord {
  return { ...row };
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

  async createStudent(data: CreateStudentData): Promise<StudentRecord> {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      const result = await new sql.Request(transaction)
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

      if (data.graduation_year === undefined) {
        throw new Error("graduation_year is required to create student profile");
      }

      await new sql.Request(transaction)
        .input("student_id", sql.Int, student.student_id)
        .input("grade", sql.TinyInt, data.grade ?? null)
        .input("graduation_year", sql.SmallInt, data.graduation_year)
        .input("date_of_birth", sql.Date, data.date_of_birth)
        .input("high_school_name", sql.VarChar(300), data.high_school_name)
        .input("state_of_residence", sql.VarChar(100), data.state_of_residence)
        .query(
          `INSERT INTO ${STUDENT_PROFILES_TABLE}
            (student_id, grade, graduation_year, date_of_birth, high_school_name, state_of_residence)
           VALUES
            (@student_id, @grade, @graduation_year, @date_of_birth, @high_school_name, @state_of_residence);`,
        );

      const consents: { type: string; status: string }[] = [];
      if (data.confirms_age_13_plus !== undefined) {
        consents.push({ type: "age_13plus", status: data.confirms_age_13_plus ? "granted" : "revoked" });
      }
      if (data.confirms_parental_permission !== undefined) {
        consents.push({ type: "parental_13_17", status: data.confirms_parental_permission ? "granted" : "revoked" });
      }
      if (data.college_data_share_consent !== undefined) {
        consents.push({ type: "college", status: data.college_data_share_consent ? "granted" : "revoked" });
      }

      for (const c of consents) {
        await new sql.Request(transaction)
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

      await transaction.commit();
      return student;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async findValidInviteToken(
    token: string,
  ): Promise<{ school_id: number; school_name: string | null } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("token", sql.VarChar(500), token)
      .query<RawInviteTokenRow>(
        `SELECT TOP 1
            it.school_id,
            s.school_name
           FROM ${INVITE_TOKENS_TABLE} it
           INNER JOIN ${SCHOOLS_TABLE} s ON s.school_id = it.school_id
          WHERE it.token = @token
            AND it.is_active = 1
            AND it.times_used < it.max_uses
            AND (it.expires_at IS NULL OR it.expires_at > SYSDATETIMEOFFSET());`,
      );
    return result.recordset[0] ?? null;
  }

  async consumeInviteToken(token: string): Promise<{ school_id: number } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("token", sql.VarChar(500), token)
      .query<{ school_id: number }>(
        `UPDATE ${INVITE_TOKENS_TABLE}
            SET times_used = times_used + 1,
                is_active = CASE WHEN times_used + 1 >= max_uses THEN 0 ELSE is_active END,
                updated_at = SYSDATETIMEOFFSET()
          OUTPUT INSERTED.school_id
          WHERE token = @token
            AND is_active = 1
            AND times_used < max_uses
            AND (expires_at IS NULL OR expires_at > SYSDATETIMEOFFSET());`,
      );
    return result.recordset[0] ?? null;
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
