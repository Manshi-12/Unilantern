import { sql, getPool } from "../../../db/client.js";
import { PUSH_TOKENS_TABLE } from "../../../db/schema/push-tokens.js";
import type { PushTokenRecord } from "./push-tokens.types.js";

// ── Raw row type from MSSQL ──────────────────────────────────────────────────
type RawPushTokenRow = {
  push_token_id: number;
  user_id: number;
  user_role: string;
  device_token: string;
  platform: string;
  device_name: string | null;
  is_active: boolean;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapPushToken(row: RawPushTokenRow): PushTokenRecord {
  return { ...row } as PushTokenRecord;
}

// ═════════════════════════════════════════════════════════════════════════════
// Repository
// ═════════════════════════════════════════════════════════════════════════════

export class PushTokensRepository {

  // ── Register (upsert) a push token ───────────────────────────────────────

  async registerToken(data: {
    user_id: number;
    user_role: string;
    device_token: string;
    platform: string;
    device_name: string | null;
  }): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("user_id", sql.Int, data.user_id)
      .input("user_role", sql.VarChar(30), data.user_role)
      .input("device_token", sql.VarChar(500), data.device_token)
      .input("platform", sql.VarChar(20), data.platform)
      .input("device_name", sql.NVarChar(200), data.device_name)
      .query<{ push_token_id: number }>(
        `MERGE ${PUSH_TOKENS_TABLE} AS target
         USING (SELECT @user_id AS uid, @user_role AS urole, @device_token AS dt) AS source
         ON target.user_id = source.uid
            AND target.user_role = source.urole
            AND target.device_token = source.dt
         WHEN MATCHED THEN
           UPDATE SET is_active    = 1,
                      platform     = @platform,
                      device_name  = @device_name,
                      last_used_at = SYSDATETIMEOFFSET(),
                      updated_at   = SYSDATETIMEOFFSET()
         WHEN NOT MATCHED THEN
           INSERT (user_id, user_role, device_token, platform, device_name)
           VALUES (@user_id, @user_role, @device_token, @platform, @device_name)
         OUTPUT INSERTED.push_token_id;`,
      );
    return result.recordset[0].push_token_id;
  }

  // ── Deregister (deactivate) a push token ─────────────────────────────────

  async deregisterToken(userId: number, userRole: string, deviceToken: string): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("user_id", sql.Int, userId)
      .input("user_role", sql.VarChar(30), userRole)
      .input("device_token", sql.VarChar(500), deviceToken)
      .query(
        `UPDATE ${PUSH_TOKENS_TABLE}
         SET is_active  = 0,
             updated_at = SYSDATETIMEOFFSET()
         WHERE user_id = @user_id
           AND user_role = @user_role
           AND device_token = @device_token;`,
      );
    return (result.rowsAffected[0] ?? 0) > 0;
  }

  // ── Get active tokens for a user ─────────────────────────────────────────

  async getActiveTokens(userId: number, userRole: string): Promise<PushTokenRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("user_id", sql.Int, userId)
      .input("user_role", sql.VarChar(30), userRole)
      .query<RawPushTokenRow>(
        `SELECT *
         FROM ${PUSH_TOKENS_TABLE}
         WHERE user_id = @user_id
           AND user_role = @user_role
           AND is_active = 1
         ORDER BY created_at DESC;`,
      );
    return result.recordset.map(mapPushToken);
  }
}
