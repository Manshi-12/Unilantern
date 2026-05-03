import sql from "mssql";
import { env } from "../config/env.js";

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(env.DATABASE_URL)
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
