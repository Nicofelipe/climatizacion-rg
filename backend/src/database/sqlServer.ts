import msnodesqlv8 from 'msnodesqlv8';
import { performanceDiagnostics, requestTiming } from '../middlewares/performance.middleware';

const quoted = (value: string) => `{${value.replace(/}/g, '}}')}`;

/**
 * Windows usa la cuenta del proceso (Trusted_Connection); el servidor Linux usa DB_USER y DB_PASSWORD.
 * `admin` permite que solo las migraciones usen una cuenta con permiso para cambiar tablas.
 */
export function connectionString(options: { database?: string; admin?: boolean } = {}, env: NodeJS.ProcessEnv = process.env) {
  const useAdmin = Boolean(options.admin && env.DB_ADMIN_USER);
  const user = useAdmin ? env.DB_ADMIN_USER : env.DB_USER;
  const password = useAdmin ? env.DB_ADMIN_PASSWORD : env.DB_PASSWORD;
  if (user && !password) throw new Error('Falta la clave de la base de datos.');
  return `Driver={${env.DB_ODBC_DRIVER ?? 'ODBC Driver 18 for SQL Server'}};` +
    `Server=${env.DB_SERVER};Database=${options.database ?? env.DB_DATABASE};` +
    (user ? `Uid=${quoted(user)};Pwd=${quoted(password!)};` : 'Trusted_Connection=Yes;') +
    `Encrypt=Yes;TrustServerCertificate=${env.DB_TRUST_SERVER_CERTIFICATE === 'false' ? 'No' : 'Yes'};` +
    'Connection Timeout=15;';
}

export type QueryParam = string | number | boolean | Date | null;

export function executeQuery<T>(sql: string, params: QueryParam[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const id = requestTiming.getStore()?.id;
    const log = (state: string) => console.log('[sql-perf]', JSON.stringify({ id, state, ms: Date.now() - started }));
    const timer = performanceDiagnostics ? setTimeout(() => log('waiting'), 5000) : null;
    timer?.unref();
    msnodesqlv8.query(connectionString(), sql, params as any, (error, rows) => {
      if (timer) clearTimeout(timer);
      if (performanceDiagnostics) log(error ? 'error' : 'finished');
      if (error) { reject(error); return; }
      resolve(rows as T[]);
    });
  });
}

export async function testDatabaseConnection() {
  return executeQuery<{ DatabaseName: string; ConnectionOk: number }>('SELECT DB_NAME() AS DatabaseName, 1 AS ConnectionOk;');
}
