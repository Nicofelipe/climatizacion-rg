import msnodesqlv8 from 'msnodesqlv8';

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
    msnodesqlv8.query(
      connectionString,
      sql,
      params as any,
      (error, rows) => {
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