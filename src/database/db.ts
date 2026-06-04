import sql from 'mssql';
import { env } from '../config/env';
import { execSync } from 'child_process';

function getLocalDbPipe(instanceName: string): string {
  const output = execSync(`SqlLocalDB info ${instanceName}`, { encoding: 'utf8' });
  const match = output.match(/Instance pipe name:\s*(np:\S+)/i);
  if (!match) throw new Error(`Could not get pipe for LocalDB instance: ${instanceName}`);
  return match[1]; // np:\\.\pipe\LOCALDB#F5DD84DF\tsql\query
}

function parseConnectionString(connStr: string): sql.config {
  const pairs: Record<string, string> = {};
  for (const part of connStr.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key   = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim().replace(/^"|"$/g, '');
    pairs[key] = value;
  }
  const get = (...keys: string[]) =>
    keys.map(k => pairs[k.toLowerCase()]).find(v => v !== undefined) ?? '';
  const bool = (val: string) =>
    val.toLowerCase() === 'true' || val.toLowerCase() === 'yes';

  const rawServer    = get('data source', 'server');
  const localDbMatch = rawServer.match(/^\(localdb\)\\(.+)$/i);
  const isLocalDb    = localDbMatch !== null;
  const instanceName = isLocalDb ? localDbMatch![1] : undefined;

  if (isLocalDb && instanceName) {
    const pipeName = getLocalDbPipe(instanceName);
    const pipePath = pipeName.replace(/^np:/i, ''); // strip "np:" prefix

    return {
      server:   '.',
      database: get('initial catalog', 'database') || 'master',
      options: {
        trustedConnection:      true,
        trustServerCertificate: bool(get('trustservercertificate')),
        encrypt:                bool(get('encrypt')),
        connectTimeout:         15000,
        requestTimeout:         0,
        connector: () => {
          const net = require('net');
          return net.createConnection(pipePath);
        },
      },
    } as any;
  }

  // Non-LocalDB (regular SQL Server)
  return {
    server:   rawServer,
    database: get('initial catalog', 'database') || 'master',
    options: {
      port:                   1433,
      trustedConnection:      bool(get('integrated security', 'trusted_connection')),
      trustServerCertificate: bool(get('trustservercertificate')),
      encrypt:                bool(get('encrypt')),
      connectTimeout:         15000,
      requestTimeout:         0,
    },
  };
}

let pool: sql.ConnectionPool | null = null;

export const getPool = async (): Promise<sql.ConnectionPool> => {
  if (pool && pool.connected) return pool;

  const config = parseConnectionString(env.DB_CONNECTION_STRING);
  pool = await new sql.ConnectionPool(config).connect();

  pool.on('error', (err) => {
    console.error('[DB] Pool error:', err);
    pool = null;
  });

  return pool;
};

export { sql };