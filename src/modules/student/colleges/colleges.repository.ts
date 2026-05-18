// ── Colleges Repository ──────────────────────────────────────────────────────
// Data-access layer for the `colleges` table.

import { sql, getPool } from "../../../db/client.js";
import { COLLEGES_TABLE } from "../../../db/schema/colleges.js";
import type { CollegeRecord, UpsertCollegeData } from "./colleges.types.js";

type RawCollegeRow = {
  college_id: number;
  name: string;
  city: string | null;
  state: string | null;
  region: string | null;
  institution_type: string | null;
  is_public: boolean | null;
  website_url: string | null;
  acceptance_rate: number | null;
  is_test_optional: boolean;
  gpa_25th: number | null;
  gpa_75th: number | null;
  sat_25th: number | null;
  sat_75th: number | null;
  act_25th: number | null;
  act_75th: number | null;
  logo_url: string | null;
  data_source: string | null;
  last_data_refresh: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: RawCollegeRow): CollegeRecord {
  return {
    college_id:       row.college_id,
    name:             row.name,
    city:             row.city,
    state:            row.state,
    region:           row.region,
    institution_type: row.institution_type,
    is_public:        row.is_public,
    website_url:      row.website_url,
    acceptance_rate:  row.acceptance_rate,
    is_test_optional: !!row.is_test_optional,
    gpa_25th:         row.gpa_25th,
    gpa_75th:         row.gpa_75th,
    sat_25th:         row.sat_25th,
    sat_75th:         row.sat_75th,
    act_25th:         row.act_25th,
    act_75th:         row.act_75th,
    logo_url:         row.logo_url,
    data_source:      row.data_source,
    last_data_refresh:row.last_data_refresh,
    is_active:        !!row.is_active,
    created_at:       row.created_at,
    updated_at:       row.updated_at,
  };
}

export class CollegesRepository {
  /** Find college by ID (active only). */
  async findById(collegeId: number): Promise<CollegeRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("college_id", sql.Int, collegeId)
      .query<RawCollegeRow>(
        `SELECT TOP 1 *
           FROM ${COLLEGES_TABLE}
          WHERE college_id = @college_id
            AND is_active  = 1;`,
      );
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  }

  /** Search colleges with optional filters. */
  async search(params: {
    q?: string;
    state?: string;
    minAcceptanceRate?: number;
    maxAcceptanceRate?: number;
    isTestOptional?: boolean;
    limit: number;
    offset: number;
  }): Promise<{ records: CollegeRecord[]; total: number }> {
    const pool = await getPool();
    const req = pool.request();

    const whereClauses: string[] = ["is_active = 1"];

    if (params.q && params.q.trim().length > 0) {
      whereClauses.push("name LIKE @q");
      req.input("q", sql.VarChar(400), `%${params.q.trim()}%`);
    }
    if (params.state) {
      whereClauses.push("state = @state");
      req.input("state", sql.VarChar(100), params.state);
    }
    if (params.minAcceptanceRate != null) {
      whereClauses.push("acceptance_rate >= @min_ar");
      req.input("min_ar", sql.Decimal(5, 2), params.minAcceptanceRate);
    }
    if (params.maxAcceptanceRate != null) {
      whereClauses.push("acceptance_rate <= @max_ar");
      req.input("max_ar", sql.Decimal(5, 2), params.maxAcceptanceRate);
    }
    if (params.isTestOptional != null) {
      whereClauses.push("is_test_optional = @is_test_opt");
      req.input("is_test_opt", sql.Bit, params.isTestOptional ? 1 : 0);
    }

    const whereSQL = whereClauses.join(" AND ");

    req.input("limit",  sql.Int, params.limit);
    req.input("offset", sql.Int, params.offset);

    const countResult = await req.query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM ${COLLEGES_TABLE} WHERE ${whereSQL};`,
    );
    const total = countResult.recordset[0]?.cnt ?? 0;

    // Need a fresh request for the second query (mssql limitation)
    const req2 = pool.request();
    if (params.q && params.q.trim().length > 0) req2.input("q", sql.VarChar(400), `%${params.q.trim()}%`);
    if (params.state) req2.input("state", sql.VarChar(100), params.state);
    if (params.minAcceptanceRate != null) req2.input("min_ar", sql.Decimal(5, 2), params.minAcceptanceRate);
    if (params.maxAcceptanceRate != null) req2.input("max_ar", sql.Decimal(5, 2), params.maxAcceptanceRate);
    if (params.isTestOptional != null) req2.input("is_test_opt", sql.Bit, params.isTestOptional ? 1 : 0);
    req2.input("limit",  sql.Int, params.limit);
    req2.input("offset", sql.Int, params.offset);

    const dataResult = await req2.query<RawCollegeRow>(
      `SELECT *
         FROM ${COLLEGES_TABLE}
        WHERE ${whereSQL}
        ORDER BY name ASC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;`,
    );

    return {
      records: dataResult.recordset.map(mapRow),
      total,
    };
  }

  /** Find an existing college by name (case-insensitive). Used to avoid duplicates on insert. */
  async findByName(name: string): Promise<CollegeRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("name", sql.VarChar(300), name)
      .query<RawCollegeRow>(
        `SELECT TOP 1 *
           FROM ${COLLEGES_TABLE}
          WHERE name = @name;`,
      );
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  }

  /** Insert a new college from external API data. Returns the inserted row. */
  async create(data: UpsertCollegeData): Promise<CollegeRecord> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("name",             sql.VarChar(300),  data.name)
      .input("city",             sql.VarChar(150),  data.city)
      .input("state",            sql.VarChar(100),  data.state)
      .input("website_url",      sql.VarChar(500),  data.website_url)
      .input("acceptance_rate",  sql.Decimal(5, 2), data.acceptance_rate)
      .input("is_test_optional", sql.Bit,           data.is_test_optional ? 1 : 0)
      .input("is_public",        sql.Bit,           data.is_public != null ? (data.is_public ? 1 : 0) : null)
      .input("logo_url",         sql.VarChar(500),  data.logo_url)
      .input("data_source",      sql.VarChar(100),  data.data_source)
      .input("sat_25th",         sql.SmallInt,      data.sat_25th)
      .input("sat_75th",         sql.SmallInt,      data.sat_75th)
      .input("act_25th",         sql.SmallInt,      data.act_25th)
      .input("act_75th",         sql.SmallInt,      data.act_75th)
      .query<RawCollegeRow>(
        `DECLARE @OutputTable TABLE (
           college_id INT,
           name VARCHAR(300),
           city VARCHAR(150) NULL,
           state VARCHAR(100) NULL,
           region VARCHAR(100) NULL,
           institution_type VARCHAR(50) NULL,
           is_public BIT NULL,
           website_url VARCHAR(500) NULL,
           acceptance_rate DECIMAL(5, 2) NULL,
           is_test_optional BIT,
           gpa_25th DECIMAL(4, 2) NULL,
           gpa_75th DECIMAL(4, 2) NULL,
           sat_25th SMALLINT NULL,
           sat_75th SMALLINT NULL,
           act_25th SMALLINT NULL,
           act_75th SMALLINT NULL,
           logo_url VARCHAR(500) NULL,
           data_source VARCHAR(100) NULL,
           last_data_refresh DATETIMEOFFSET NULL,
           is_active BIT,
           created_at DATETIMEOFFSET,
           updated_at DATETIMEOFFSET
         );

         INSERT INTO ${COLLEGES_TABLE}
           (name, city, state, website_url, acceptance_rate,
            is_test_optional, is_public, logo_url, data_source,
            sat_25th, sat_75th, act_25th, act_75th,
            last_data_refresh)
         OUTPUT
           INSERTED.college_id,
           INSERTED.name,
           INSERTED.city,
           INSERTED.state,
           INSERTED.region,
           INSERTED.institution_type,
           INSERTED.is_public,
           INSERTED.website_url,
           INSERTED.acceptance_rate,
           INSERTED.is_test_optional,
           INSERTED.gpa_25th,
           INSERTED.gpa_75th,
           INSERTED.sat_25th,
           INSERTED.sat_75th,
           INSERTED.act_25th,
           INSERTED.act_75th,
           INSERTED.logo_url,
           INSERTED.data_source,
           INSERTED.last_data_refresh,
           INSERTED.is_active,
           INSERTED.created_at,
           INSERTED.updated_at
         INTO @OutputTable
         VALUES
           (@name, @city, @state, @website_url, @acceptance_rate,
            @is_test_optional, @is_public, @logo_url, @data_source,
            @sat_25th, @sat_75th, @act_25th, @act_75th,
            SYSDATETIMEOFFSET());

         SELECT * FROM @OutputTable;`,
      );

    const row = result.recordset[0];
    if (!row) throw new Error("Failed to insert college row");
    return mapRow(row);
  }

  /** Update an existing college's data (e.g. during refresh jobs). */
  async updateFromExternal(collegeId: number, data: Partial<UpsertCollegeData>): Promise<CollegeRecord> {
    const pool = await getPool();
    const setClauses: string[] = ["last_data_refresh = SYSDATETIMEOFFSET()"];
    const req = pool.request().input("college_id", sql.Int, collegeId);

    if (data.acceptance_rate !== undefined) {
      setClauses.push("acceptance_rate = @acceptance_rate");
      req.input("acceptance_rate", sql.Decimal(5, 2), data.acceptance_rate);
    }
    if (data.logo_url !== undefined) {
      setClauses.push("logo_url = @logo_url");
      req.input("logo_url", sql.VarChar(500), data.logo_url);
    }
    if (data.website_url !== undefined) {
      setClauses.push("website_url = @website_url");
      req.input("website_url", sql.VarChar(500), data.website_url);
    }
    if (data.is_test_optional !== undefined) {
      setClauses.push("is_test_optional = @is_test_optional");
      req.input("is_test_optional", sql.Bit, data.is_test_optional ? 1 : 0);
    }
    if (data.sat_25th !== undefined) {
      setClauses.push("sat_25th = @sat_25th");
      req.input("sat_25th", sql.SmallInt, data.sat_25th);
    }
    if (data.sat_75th !== undefined) {
      setClauses.push("sat_75th = @sat_75th");
      req.input("sat_75th", sql.SmallInt, data.sat_75th);
    }
    if (data.act_25th !== undefined) {
      setClauses.push("act_25th = @act_25th");
      req.input("act_25th", sql.SmallInt, data.act_25th);
    }
    if (data.act_75th !== undefined) {
      setClauses.push("act_75th = @act_75th");
      req.input("act_75th", sql.SmallInt, data.act_75th);
    }

    const result = await req.query<RawCollegeRow>(
      `DECLARE @OutputTable TABLE (
         college_id INT,
         name VARCHAR(300),
         city VARCHAR(150) NULL,
         state VARCHAR(100) NULL,
         region VARCHAR(100) NULL,
         institution_type VARCHAR(50) NULL,
         is_public BIT NULL,
         website_url VARCHAR(500) NULL,
         acceptance_rate DECIMAL(5, 2) NULL,
         is_test_optional BIT,
         gpa_25th DECIMAL(4, 2) NULL,
         gpa_75th DECIMAL(4, 2) NULL,
         sat_25th SMALLINT NULL,
         sat_75th SMALLINT NULL,
         act_25th SMALLINT NULL,
         act_75th SMALLINT NULL,
         logo_url VARCHAR(500) NULL,
         data_source VARCHAR(100) NULL,
         last_data_refresh DATETIMEOFFSET NULL,
         is_active BIT,
         created_at DATETIMEOFFSET,
         updated_at DATETIMEOFFSET
       );

       UPDATE ${COLLEGES_TABLE}
          SET ${setClauses.join(", ")}
        OUTPUT
          INSERTED.college_id,
          INSERTED.name,
          INSERTED.city,
          INSERTED.state,
          INSERTED.region,
          INSERTED.institution_type,
          INSERTED.is_public,
          INSERTED.website_url,
          INSERTED.acceptance_rate,
          INSERTED.is_test_optional,
          INSERTED.gpa_25th,
          INSERTED.gpa_75th,
          INSERTED.sat_25th,
          INSERTED.sat_75th,
          INSERTED.act_25th,
          INSERTED.act_75th,
          INSERTED.logo_url,
          INSERTED.data_source,
          INSERTED.last_data_refresh,
          INSERTED.is_active,
          INSERTED.created_at,
          INSERTED.updated_at
        INTO @OutputTable
        WHERE college_id = @college_id;

       SELECT * FROM @OutputTable;`,
    );
    const row = result.recordset[0];
    if (!row) throw new Error("Update returned no row — college_id not found");
    return mapRow(row);
  }
}
