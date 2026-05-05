import { sql, getPool } from "../../db/client.js";
import { COMMUNITY_SERVICE_ENTRIES_TABLE } from "../../db/schema/community-service-entries.js";
import type { CreateServiceData, ServiceEntryRecord, UpdateServiceData } from "./service.types.js";

type RawServiceRow = ServiceEntryRecord;

function mapService(row: RawServiceRow): ServiceEntryRecord {
  return {
    ...row,
    is_leadership: Boolean(row.is_leadership),
  };
}

export class ServiceRepository {
  async listByStudentId(studentId: number): Promise<ServiceEntryRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<RawServiceRow>(
        `SELECT service_id, student_id, total_hours_range, action_type, is_leadership,
                duration_months, display_order, created_at, updated_at
           FROM ${COMMUNITY_SERVICE_ENTRIES_TABLE}
          WHERE student_id = @student_id
          ORDER BY display_order ASC, service_id ASC;`,
      );
    return result.recordset.map(mapService);
  }

  async countByStudentId(studentId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<{ count: number }>(
        `SELECT COUNT(*) AS count FROM ${COMMUNITY_SERVICE_ENTRIES_TABLE} WHERE student_id = @student_id;`,
      );
    return result.recordset[0]?.count ?? 0;
  }

  async create(data: CreateServiceData): Promise<ServiceEntryRecord> {
    const pool = await getPool();
    const orderResult = await pool
      .request()
      .input("student_id", sql.Int, data.student_id)
      .query<{ display_order: number }>(
        `SELECT ISNULL(MAX(display_order), 0) + 1 AS display_order
           FROM ${COMMUNITY_SERVICE_ENTRIES_TABLE}
          WHERE student_id = @student_id;`,
      );

    const result = await pool
      .request()
      .input("student_id", sql.Int, data.student_id)
      .input("total_hours_range", sql.VarChar(10), data.total_hours_range)
      .input("action_type", sql.VarChar(15), data.action_type)
      .input("is_leadership", sql.Bit, data.is_leadership)
      .input("duration_months", sql.SmallInt, data.duration_months ?? null)
      .input("display_order", sql.SmallInt, orderResult.recordset[0]?.display_order ?? 1)
      .query<RawServiceRow>(
        `INSERT INTO ${COMMUNITY_SERVICE_ENTRIES_TABLE}
          (student_id, total_hours_range, action_type, is_leadership, duration_months, display_order)
         OUTPUT INSERTED.service_id, INSERTED.student_id, INSERTED.total_hours_range, INSERTED.action_type,
                INSERTED.is_leadership, INSERTED.duration_months, INSERTED.display_order,
                INSERTED.created_at, INSERTED.updated_at
         VALUES (@student_id, @total_hours_range, @action_type, @is_leadership, @duration_months, @display_order);`,
      );

    const row = result.recordset[0];
    if (!row) throw new Error("Failed to insert community service entry");
    return mapService(row);
  }

  async update(serviceId: number, studentId: number, data: UpdateServiceData): Promise<number> {
    const pool = await getPool();
    const setClauses: string[] = [];
    const request = pool
      .request()
      .input("service_id", sql.Int, serviceId)
      .input("student_id", sql.Int, studentId);

    if (data.total_hours_range !== undefined) {
      request.input("total_hours_range", sql.VarChar(10), data.total_hours_range);
      setClauses.push("total_hours_range = @total_hours_range");
    }
    if (data.action_type !== undefined) {
      request.input("action_type", sql.VarChar(15), data.action_type);
      setClauses.push("action_type = @action_type");
    }
    if (data.is_leadership !== undefined) {
      request.input("is_leadership", sql.Bit, data.is_leadership);
      setClauses.push("is_leadership = @is_leadership");
    }
    if (data.duration_months !== undefined) {
      request.input("duration_months", sql.SmallInt, data.duration_months);
      setClauses.push("duration_months = @duration_months");
    }

    if (setClauses.length === 0) return 0;
    setClauses.push("updated_at = SYSDATETIMEOFFSET()");

    const result = await request.query(
      `UPDATE ${COMMUNITY_SERVICE_ENTRIES_TABLE}
          SET ${setClauses.join(", ")}
        WHERE service_id = @service_id AND student_id = @student_id;`,
    );
    return result.rowsAffected[0] ?? 0;
  }

  async delete(serviceId: number, studentId: number): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("service_id", sql.Int, serviceId)
      .input("student_id", sql.Int, studentId)
      .query(
        `DELETE FROM ${COMMUNITY_SERVICE_ENTRIES_TABLE}
          WHERE service_id = @service_id AND student_id = @student_id;`,
      );
    return result.rowsAffected[0] ?? 0;
  }
}
