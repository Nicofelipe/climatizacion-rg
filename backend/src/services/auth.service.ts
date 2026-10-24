import bcrypt from 'bcryptjs';
import msnodesqlv8 from 'msnodesqlv8';

import { recordSuccessfulLogin,passwordSession } from './passwordPolicy.service';
// Match the password work factor even when the mailbox is unknown.
const dummyHash=bcrypt.hashSync('unregistered-account-placeholder',12);

const connectionString =
    'Driver={ODBC Driver 18 for SQL Server};' +
    `Server=${process.env.DB_SERVER};` +
    `Database=${process.env.DB_DATABASE};` +
    'Trusted_Connection=Yes;' +
    'TrustServerCertificate=Yes;';

interface LoginUserRow {
    Id: number;
    CompanyId: number;
    RoleId: number;
    FirstName: string;
    LastName: string;
    Email: string;
    PasswordHash: string;
    IsActive:boolean;
    RoleName: string;
}

type QueryParams = NonNullable<
    Parameters<typeof msnodesqlv8.query>[2]
>;

function query<T>(
    sql: string,
    params: QueryParams
): Promise<T[]> {
    return new Promise((resolve, reject) => {
        msnodesqlv8.query(connectionString, sql, params, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(rows as T[]);
        });
    });
}

export async function loginService(email: string, password: string) {
    const users = await query<LoginUserRow>(
        `
      SELECT
        u.Id,
        u.CompanyId,
        u.RoleId,
        u.FirstName,
        u.LastName,
        u.Email,
        u.PasswordHash,
        u.IsActive,
        r.Name AS RoleName
      FROM dbo.AppUser AS u
      INNER JOIN dbo.Role AS r
        ON r.Id = u.RoleId
      INNER JOIN dbo.Company AS c
        ON c.Id = u.CompanyId
      WHERE u.Email = ?
        AND r.IsActive = 1
        AND c.IsActive = 1;
    `,
        [email]
    );

    const user = users[0];

    if (!user || users.length !== 1) {
        await bcrypt.compare(password,dummyHash);
        throw new Error('INVALID_CREDENTIALS');
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.PasswordHash
    );

    if (!passwordMatches) {
        throw new Error('INVALID_CREDENTIALS');
    }

    if(!user.IsActive)throw new Error('ACCOUNT_INACTIVE');

    const account=await recordSuccessfulLogin(user.CompanyId,user.Id,'PASSWORD');
    if(account.PasswordHash!==user.PasswordHash)throw new Error('INVALID_CREDENTIALS');
    return passwordSession(account);

}
