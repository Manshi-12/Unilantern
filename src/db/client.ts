import { createRequire } from "node:module";
import type * as MSSql from "mssql";

const require = createRequire(import.meta.url);
const sql = require("mssql/msnodesqlv8") as typeof MSSql;

let poolPromise: Promise<MSSql.ConnectionPool> | null = null;

function buildConfig(): MSSql.config {
  const url = process.env.DATABASE_URL ?? "";
  const get = (key: string): string => {
    const match = new RegExp(`${key}=([^;]+)`, "i").exec(url);
    return match ? match[1].trim() : "";
  };

  const dataSource = get("Data Source") || get("Server");
  const database = get("Initial Catalog") || get("Database");

  const connectionString =
    `Driver={ODBC Driver 17 for SQL Server};` +
    `Server=${dataSource};` +
    `Database=${database};` +
    `Trusted_Connection=Yes;`;

  return { connectionString } as unknown as MSSql.config;
}

export function getPool(): Promise<MSSql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(buildConfig())
      .connect()
      .then((pool) => {
        pool.on("error", (err) => console.error("[mssql] pool error:", err));
        return pool;
      });
  }
  return poolPromise;
}

export async function closePool(): Promise<void> {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close();
    poolPromise = null;
  }
}

export { sql };
