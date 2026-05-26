import type {
  InviteRecord,
  AdvisorRecord,
  SchoolRecord,
} from './advisor-auth.types.js'

import {
  getPool,
  sql,
} from '../../../db/client.js'

// ============================================
// Repository
// ============================================

export const advisorAuthRepository = {

  // ============================================
  // Find invite by token
  // ============================================

  findInviteByToken: async (
    token: string
  ): Promise<InviteRecord | null> => {

    const pool = await getPool()

    const result = await pool
      .request()
      .input('token', sql.VarChar, token)
      .query(`
        SELECT *
        FROM advisor_invites
        WHERE token = @token
      `)

    return result.recordset[0] || null
  },

  // ============================================
  // Find school by ID
  // ============================================

  findSchoolById: async (
    schoolId: number
  ): Promise<SchoolRecord | null> => {

    const pool = await getPool()

    const result = await pool
      .request()
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT *
        FROM schools
        WHERE school_id = @schoolId
      `)

    return result.recordset[0] || null
  },

  // ============================================
  // Find advisor by email
  // ============================================

  findAdvisorByEmail: async (
    email: string
  ): Promise<AdvisorRecord | null> => {

    const pool = await getPool()

    const result = await pool
      .request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT *
        FROM advisors
        WHERE email = @email
      `)

    return result.recordset[0] || null
  },

  // ============================================
  // Create advisor
  // ============================================

  createAdvisor: async (
    data: Omit<
      AdvisorRecord,
      'advisor_id' |
      'created_at' |
      'updated_at'
    >
  ): Promise<AdvisorRecord> => {

    const pool = await getPool()

    const result = await pool
      .request()

      .input('school_id', sql.Int, data.school_id)
      .input('full_name', sql.VarChar, data.full_name)
      .input('email', sql.VarChar, data.email)
      .input('password_hash', sql.VarChar, data.password_hash)
      .input('contact_no', sql.VarChar, data.contact_no)
      .input('role', sql.VarChar, data.role)
      .input('is_active', sql.Bit, data.is_active)
      .input(
        'is_email_verified',
        sql.Bit,
        data.is_email_verified
      )

      .query(`
        INSERT INTO advisors (
          school_id,
          full_name,
          email,
          password_hash,
          contact_no,
          role,
          is_active,
          is_email_verified,
          created_at,
          updated_at
        )

        OUTPUT INSERTED.*

        VALUES (
          @school_id,
          @full_name,
          @email,
          @password_hash,
          @contact_no,
          @role,
          @is_active,
          @is_email_verified,
          GETDATE(),
          GETDATE()
        )
      `)

    return result.recordset[0]
  },

  // ============================================
  // Mark invite accepted
  // ============================================

  markInviteAccepted: async (
    token: string
  ): Promise<void> => {

    const pool = await getPool()

    await pool
      .request()
      .input('token', sql.VarChar, token)
      .query(`
        UPDATE advisor_invites
        SET status = 'accepted'
        WHERE token = @token
      `)
  },

  // ============================================
  // Create session
  // ============================================

  createSession: async (data: {
    advisor_id: number
    token_hash: string
    ip_address: string | null
    device_info: string | null
    expires_at: Date
  }): Promise<void> => {

    const pool = await getPool()

    await pool
      .request()

      .input('advisor_id', sql.Int, data.advisor_id)
      .input('token_hash', sql.VarChar, data.token_hash)
      .input('ip_address', sql.VarChar, data.ip_address)
      .input('device_info', sql.VarChar, data.device_info)
      .input('expires_at', sql.DateTime2, data.expires_at)

      .query(`
        INSERT INTO advisor_sessions (
          advisor_id,
          token_hash,
          ip_address,
          device_info,
          created_at,
          expires_at
        )

        VALUES (
          @advisor_id,
          @token_hash,
          @ip_address,
          @device_info,
          GETDATE(),
          @expires_at
        )
      `)
  },

  // ============================================
  // Invalidate session
  // ============================================

  invalidateSession: async (
    tokenHash: string
  ): Promise<void> => {

    const pool = await getPool()

    await pool
      .request()

      .input('tokenHash', sql.VarChar, tokenHash)

      .query(`
        UPDATE advisor_sessions

        SET invalidated_at = GETDATE()

        WHERE token_hash = @tokenHash
      `)
  },
// ============================================
// Find session by token
// ============================================

findSessionByTokenHash: async (
  tokenHash: string
): Promise<{
  advisor_id: number
  expires_at: Date
  invalidated_at: Date | null
} | null> => {

  const pool = await getPool()

  const result = await pool
    .request()
    .input('tokenHash', sql.VarChar, tokenHash)
    .query(`
      SELECT
        advisor_id,
        expires_at,
        invalidated_at
      FROM advisor_sessions
      WHERE token_hash = @tokenHash
    `)

  return result.recordset[0] || null
},

// ============================================
// Rotate session token
// ============================================

updateSessionToken: async (
  oldTokenHash: string,
  newTokenHash: string,
  newExpiresAt: Date
): Promise<void> => {

  const pool = await getPool()

  await pool
    .request()
    .input('oldTokenHash', sql.VarChar, oldTokenHash)
    .input('newTokenHash', sql.VarChar, newTokenHash)
    .input('newExpiresAt', sql.DateTime2, newExpiresAt)

    .query(`
      UPDATE advisor_sessions

      SET
        token_hash = @newTokenHash,
        expires_at = @newExpiresAt

      WHERE token_hash = @oldTokenHash
    `)
},

// ============================================
// Find advisor by ID
// ============================================

findAdvisorById: async (
  advisorId: number
): Promise<AdvisorRecord | null> => {

  const pool = await getPool()

  const result = await pool
    .request()
    .input('advisorId', sql.Int, advisorId)
    .query(`
      SELECT *
      FROM advisors
      WHERE advisor_id = @advisorId
    `)

  return result.recordset[0] || null
},

// ============================================
// Update advisor password
// ============================================

updateAdvisorPassword: async (
  advisorId: number,
  newPasswordHash: string
): Promise<void> => {

  const pool = await getPool()

  await pool
    .request()

    .input('advisorId', sql.Int, advisorId)
    .input(
      'newPasswordHash',
      sql.VarChar,
      newPasswordHash
    )

    .query(`
      UPDATE advisors

      SET
        password_hash = @newPasswordHash,
        updated_at = GETDATE()

      WHERE advisor_id = @advisorId
    `)
},

// ============================================
// Invalidate all sessions
// ============================================

invalidateAllSessions: async (
  advisorId: number
): Promise<void> => {

  const pool = await getPool()

  await pool
    .request()
    .input('advisorId', sql.Int, advisorId)

    .query(`
      UPDATE advisor_sessions

      SET invalidated_at = GETDATE()

      WHERE
        advisor_id = @advisorId
        AND invalidated_at IS NULL
    `)
},
}