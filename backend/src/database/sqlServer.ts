import type { ConnectionPool } from 'mssql';
import { performanceDiagnostics, requestTiming } from '../middlewares/performance.middleware';

/*
 * Dos formas de conectarse, con las mismas consultas:
 * - Windows (sin DB_USER): msnodesqlv8 con la cuenta del proceso.
 * - Servidor Linux (con DB_USER): mssql/tedious, JavaScript puro. El controlador ODBC se bloquea en Linux.
 * Las consultas usan "?" como marcador de parámetro en ambos casos.
 */

const quoted = (value: string) => `{${value.replace(/}/g, '}}')}`;
export interface ConnectionOptions { database?: string; admin?: boolean }

function credentials(options: ConnectionOptions, env: NodeJS.ProcessEnv) {
  const useAdmin = Boolean(options.admin && env.DB_ADMIN_USER);
  const user = useAdmin ? env.DB_ADMIN_USER : env.DB_USER;
  const password = useAdmin ? env.DB_ADMIN_PASSWORD : env.DB_PASSWORD;
  if (user && !password) throw new Error('Falta la clave de la base de datos.');
  return { user, password };
}

/** Cadena ODBC para Windows (y pruebas que usan el controlador nativo). */
export function connectionString(options: ConnectionOptions = {}, env: NodeJS.ProcessEnv = process.env) {
  const { user, password } = credentials(options, env);
  return `Driver={${env.DB_ODBC_DRIVER ?? 'ODBC Driver 18 for SQL Server'}};` +
    `Server=${env.DB_SERVER};Database=${options.database ?? env.DB_DATABASE};` +
    (user ? `Uid=${quoted(user)};Pwd=${quoted(password!)};` : 'Trusted_Connection=Yes;') +
    `Encrypt=Yes;TrustServerCertificate=${env.DB_TRUST_SERVER_CERTIFICATE === 'false' ? 'No' : 'Yes'};` +
    'Connection Timeout=15;';
}

/**
 * Cambia cada "?" por @p0, @p1… sin tocar textos entre comillas, nombres entre corchetes ni comentarios.
 */
export function namedParameters(sql: string) {
  let out = '', index = 0;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'" || char === '[' || char === '"') {
      const close = char === '[' ? ']' : char;
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === close) { if (close !== ']' && sql[j + 1] === close) { j += 2; continue; } break; }
        j++;
      }
      out += sql.slice(i, j + 1);
      i = j;
    } else if (char === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end;
      out += sql.slice(i, stop);
      i = stop - 1;
    } else if (char === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      out += sql.slice(i, stop);
      i = stop - 1;
    } else if (char === '?') out += `@p${index++}`;
    else out += char;
  }
  return { sql: out, count: index };
}

export type QueryParam = string | number | boolean | Date | null;

const pools = new Map<string, Promise<ConnectionPool>>();
async function pool(options: ConnectionOptions) {
  const env = process.env;
  const { user, password } = credentials(options, env);
  const database = options.database ?? env.DB_DATABASE!;
  const key = `${user}@${database}`;
  let existing = pools.get(key);
  if (!existing) {
    // Se carga solo en Linux; require evita el envoltorio de import() en CommonJS.
    const mssql = require('mssql') as typeof import('mssql');
    const [server, port] = String(env.DB_SERVER).split(',');
    existing = new mssql.ConnectionPool({
      server, port: port ? Number(port) : 1433, database, user, password,
      options: { encrypt: true, trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE !== 'false', useUTC: true, enableArithAbort: true },
      pool: { max: 10, min: 0, idleTimeoutMillis: 60000 },
      connectionTimeout: 15000, requestTimeout: 120000,
    }).connect();
    existing.catch(() => pools.delete(key));
    pools.set(key, existing);
  }
  return existing;
}

/** Ejecuta y devuelve todas las filas de todos los resultados (para scripts de migración). */
export async function executeBatch(sql: string, options: ConnectionOptions = {}): Promise<Record<string, unknown>[]> {
  if (credentials(options, process.env).user) {
    const result = await (await pool(options)).request().batch(sql);
    return (result.recordsets as unknown as Record<string, unknown>[][]).flat();
  }
  const msnodesqlv8 = require('msnodesqlv8');
  return new Promise((resolve, reject) => {
    const rows: Record<string, unknown>[] = [];
    let done = false;
    msnodesqlv8.query(connectionString(options), sql, [], (error: Error | null, result: Record<string, unknown>[] | undefined, more: boolean) => {
      if (done) return;
      if (error) { done = true; reject(error); return; }
      rows.push(...(result ?? []));
      if (!more) { done = true; resolve(rows); }
    });
  });
}

/** Devuelve las filas del primer resultado, como hacen todas las consultas de la app. */
export async function executeQuery<T>(sql: string, params: QueryParam[] = []): Promise<T[]> {
  const started = Date.now();
  const id = requestTiming.getStore()?.id;
  const log = (state: string) => console.log('[sql-perf]', JSON.stringify({ id, state, ms: Date.now() - started }));
  const timer = performanceDiagnostics ? setTimeout(() => log('waiting'), 5000) : null;
  timer?.unref();
  try {
    let rows: T[];
    if (process.env.DB_USER) {
      const named = namedParameters(sql);
      if (named.count !== params.length) throw new Error(`La consulta espera ${named.count} parámetros y recibió ${params.length}.`);
      const request = (await pool({})).request();
      params.forEach((value, index) => request.input(`p${index}`, value));
      const result = await request.query(named.sql);
      rows = ((result.recordsets as unknown as T[][])[0] ?? []) as T[];
    } else {
      const msnodesqlv8 = require('msnodesqlv8');
      rows = await new Promise<T[]>((resolve, reject) => {
        msnodesqlv8.query(connectionString(), sql, params, (error: Error | null, result: T[]) => error ? reject(error) : resolve(result));
      });
    }
    if (performanceDiagnostics) log('finished');
    return rows;
  } catch (error) {
    if (performanceDiagnostics) log('error');
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function testDatabaseConnection() {
  return executeQuery<{ DatabaseName: string; ConnectionOk: number }>('SELECT DB_NAME() AS DatabaseName, 1 AS ConnectionOk;');
}
