import { sql, getPool } from "../../../db/client.js";
import { PUSH_TOKENS_TABLE } from "../../../db/schema/push-tokens.js";
import type { PushTokenRecord } from "./push-tokens.types.js";

// ── Raw row type from MSSQL ──────────────────────────────────────────────────
type RawPushTokenRow = {
  push_token_id: number;
  user_id: number;
  user_role: string;
  device_id: string | null;
  push_token: string;
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
  // ── Register (upsert) a push token — keyed by user + role + device_id ───────

  async registerToken(data: {
    user_id: number;
    user_role: string;
    device_id: string;
    push_token: string;
    platform: string;
    device_name: string | null;
  }): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("user_id", sql.Int, data.user_id)
      .input("user_role", sql.VarChar(30), data.user_role)
      .input("device_id", sql.VarChar(128), data.device_id)
      .input("push_token", sql.VarChar(500), data.push_token)
      .input("platform", sql.VarChar(20), data.platform)
      .input("device_name", sql.NVarChar(200), data.device_name)
      .query<{ push_token_id: number }>(
        `MERGE ${PUSH_TOKENS_TABLE} AS target
         USING (SELECT @user_id AS uid, @user_role AS urole, @device_id AS did) AS source
         ON target.user_id = source.uid
            AND target.user_role = source.urole
            AND target.device_id = source.did
         WHEN MATCHED THEN
           UPDATE SET push_token   = @push_token,
                      platform     = @platform,
                      device_name  = @device_name,
                      is_active    = 1,
                      last_used_at = SYSDATETIMEOFFSET(),
                      updated_at   = SYSDATETIMEOFFSET()
         WHEN NOT MATCHED THEN
           INSERT (user_id, user_role, device_id, push_token, platform, device_name)
           VALUES (@user_id, @user_role, @device_id, @push_token, @platform, @device_name)
         OUTPUT INSERTED.push_token_id;`,
      );
    return result.recordset[0].push_token_id;
  }

  // ── Deregister (deactivate) by device_id ───────────────────────────────────

  async deregisterToken(userId: number, userRole: string, deviceId: string): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("user_id", sql.Int, userId)
      .input("user_role", sql.VarChar(30), userRole)
      .input("device_id", sql.VarChar(128), deviceId)
      .query(
        `UPDATE ${PUSH_TOKENS_TABLE}
         SET is_active  = 0,
             updated_at = SYSDATETIMEOFFSET()
         WHERE user_id = @user_id
           AND user_role = @user_role
           AND device_id = @device_id;`,
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
