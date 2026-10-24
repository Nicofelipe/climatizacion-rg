import msnodesqlv8 from 'msnodesqlv8';
import {performanceDiagnostics,requestTiming} from '../middlewares/performance.middleware';

const connectionString =
  'Driver={ODBC Driver 18 for SQL Server};' +
  `Server=${process.env.DB_SERVER};` +
  `Database=${process.env.DB_DATABASE};` +
  'Trusted_Connection=Yes;' +
  'TrustServerCertificate=Yes;';

export type QueryParam =
  | string
  | number
  | boolean
  | Date
  | null;

export function executeQuery<T>(
  sql: string,
  params: QueryParam[] = []
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const started=Date.now(),id=requestTiming.getStore()?.id;
    const timer=performanceDiagnostics?setTimeout(()=>console.log('[sql-perf]',JSON.stringify({id,state:'waiting',ms:Date.now()-started})),5000):null;
    timer?.unref();
    msnodesqlv8.query(
      connectionString,
      sql,
      params as any,
      (error, rows) => {
        if(timer)clearTimeout(timer);
        if(performanceDiagnostics)console.log('[sql-perf]',JSON.stringify({id,state:error?'error':'finished',ms:Date.now()-started}));
        if (error) {
          reject(error);
          return;
        }

        resolve(rows as T[]);
      }
    );
  });
}

export async function testDatabaseConnection() {
  return executeQuery<{
    DatabaseName: string;
    ConnectionOk: number;
  }>(
    `
      SELECT
        DB_NAME() AS DatabaseName,
        1 AS ConnectionOk
    `,
    []
  );
}
