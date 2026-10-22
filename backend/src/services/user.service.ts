import bcrypt from 'bcryptjs';

import { executeQuery } from '../database/sqlServer';

interface CreateEmployeeInput {
    companyId: number;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string | null;
}

interface CreatedUserRow {
    Id: number;
    CompanyId: number;
    RoleId: number;
    FirstName: string;
    LastName: string;
    Email: string;
    Phone: string | null;
    IsActive: boolean;
    CreatedAt: string;
}

export async function createEmployee(
    input: CreateEmployeeInput
) {
    const normalizedEmail =
        input.email.trim().toLowerCase();

    const existingUsers =
        await executeQuery<{ Id: number }>(
            `
            SELECT Id
            FROM dbo.AppUser
            WHERE Email = ?;
            `,
            [normalizedEmail]
        );

    if (existingUsers.length > 0) {
        throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(
        input.password,
        12
    );

    const rows =
        await executeQuery<CreatedUserRow>(
            `
            INSERT INTO dbo.AppUser
            (
                CompanyId,
                RoleId,
                FirstName,
                LastName,
                Email,
                PasswordHash,
                Phone,
                IsActive
            )
            OUTPUT
                INSERTED.Id,
                INSERTED.CompanyId,
                INSERTED.RoleId,
                INSERTED.FirstName,
                INSERTED.LastName,
                INSERTED.Email,
                INSERTED.Phone,
                INSERTED.IsActive,
                INSERTED.CreatedAt
            VALUES
            (
                ?,
                (SELECT Id FROM dbo.Role WHERE Name = N'EMPLOYEE' AND IsActive = 1),
                ?,
                ?,
                ?,
                ?,
                ?,
                1
            );
            `,
            [
                input.companyId,
                input.firstName.trim(),
                input.lastName.trim(),
                normalizedEmail,
                passwordHash,
                input.phone?.trim() || null,
            ]
        );

    return rows[0];
}
