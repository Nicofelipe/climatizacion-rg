import msnodesqlv8 from 'msnodesqlv8';

const connectionString =
  'Driver={ODBC Driver 18 for SQL Server};' +
  `Server=${process.env.DB_SERVER};` +
  `Database=${process.env.DB_DATABASE};` +
  'Trusted_Connection=Yes;' +
  'TrustServerCertificate=Yes;';

export async function testDatabaseConnection() {
  return new Promise((resolve, reject) => {
    msnodesqlv8.query(
      connectionString,
      'SELECT DB_NAME() AS DatabaseName, 1 AS ConnectionOk',
      (error, rows) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(rows);
      }
    );
  });
}