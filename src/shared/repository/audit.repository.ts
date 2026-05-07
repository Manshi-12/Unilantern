import { sql, getPool } from "../../db/client.js";
import { AUDIT_LOGS_TABLE } from "../../db/schema/audit-logs.js";

export class AuditRepository {
  async log(data: {
    actor_id: number; // Changed from actor_user_id
    actor_role: string;
    action_type: string;
    target_resource?: string;
    metadata?: any;
    ip_address?: string;
    user_agent?: string;
    actor_school_id?: number | null;
  }): Promise<void> {
    try {
      const pool = await getPool();
      await pool.request()
        .input("actor_id", sql.Int, data.actor_id)
        .input("actor_role", sql.VarChar(20), data.actor_role)
        .input("actor_school_id", sql.Int, data.actor_school_id ?? null)
        .input("action_type", sql.VarChar(80), data.action_type)
        .input("target_resource", sql.VarChar(150), data.target_resource || null)
        .input("metadata", sql.NVarChar(sql.MAX), data.metadata ? JSON.stringify(data.metadata) : "{}")
        .input("ip_address", sql.VarChar(50), data.ip_address || null)
        .input("user_agent", sql.NVarChar(sql.MAX), data.user_agent || null)
        .query(`
          INSERT INTO ${AUDIT_LOGS_TABLE} (
            actor_id, actor_role, actor_school_id, action_type, target_resource,
            metadata, ip_address, user_agent
          )
          VALUES (
            @actor_id, @actor_role, @actor_school_id, @action_type, @target_resource,
            @metadata, @ip_address, @user_agent
          )
        `);
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }
  }
}
