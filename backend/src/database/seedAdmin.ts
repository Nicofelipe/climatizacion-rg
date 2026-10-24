import 'dotenv/config';

import bcrypt from 'bcryptjs';
import msnodesqlv8 from 'msnodesqlv8';

const connectionString =
  'Driver={ODBC Driver 18 for SQL Server};' +
  `Server=${process.env.DB_SERVER};` +
  `Database=${process.env.DB_DATABASE};` +
  'Trusted_Connection=Yes;' +
  'TrustServerCertificate=Yes;';

function query<T = unknown>(sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    msnodesqlv8.query(connectionString, sql, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows as T[]);
    });
  });
}

async function seedAdmin() {
  const firstName = process.env.ADMIN_SEED_FIRST_NAME;
  const lastName = process.env.ADMIN_SEED_LAST_NAME;
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!firstName || !lastName || !email || !password) {
    throw new Error('Missing ADMIN_SEED_* environment variables');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const safeFirstName = firstName.replace(/'/g, "''");
  const safeLastName = lastName.replace(/'/g, "''");
  const safeEmail = email.replace(/'/g, "''");
  const safePasswordHash = passwordHash.replace(/'/g, "''");

  const existingUsers = await query<{ Id: number }>(`
    SELECT Id
    FROM dbo.AppUser
    WHERE CompanyId = 1
      AND Email = N'${safeEmail}';
  `);

  if (existingUsers.length > 0) {
    console.log('Admin user already exists.');
    return;
  }

  await query(`
    INSERT INTO dbo.AppUser
    (
      CompanyId,
      RoleId,
      FirstName,
      LastName,
      Email,
      PasswordHash
    )
    VALUES
    (
      1,
      1,
      N'${safeFirstName}',
      N'${safeLastName}',
      N'${safeEmail}',
      N'${safePasswordHash}'
    );
  `);

  console.log('Admin user created successfully.');
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to create admin user:', error);
    process.exitCode = 1;
  });