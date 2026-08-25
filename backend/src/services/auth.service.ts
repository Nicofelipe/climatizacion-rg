import bcrypt from 'bcryptjs';
import msnodesqlv8 from 'msnodesqlv8';
import { generateAccessToken } from './token.service';

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
        r.Name AS RoleName
      FROM dbo.AppUser AS u
      INNER JOIN dbo.Role AS r
        ON r.Id = u.RoleId
      WHERE u.Email = ?
        AND u.IsActive = 1;
    `,
        [email]
    );

    const user = users[0];

    if (!user) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.PasswordHash
    );

    if (!passwordMatches) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const token = generateAccessToken({
        userId: user.Id,
        companyId: user.CompanyId,
        role: user.RoleName,
    });

    return {
        user: {
            id: user.Id,
            companyId: user.CompanyId,
            firstName: user.FirstName,
            lastName: user.LastName,
            email: user.Email,
            role: user.RoleName,
        },
        token,
    };
}