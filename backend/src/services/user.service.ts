import bcrypt from 'bcryptjs';

import { executeQuery } from '../database/sqlServer';

interface CreateEmployeeInput {
    rut?:string;
    actorId:number;
    role:'EMPLOYEE'|'ADMIN';
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
            SET NOCOUNT ON; SET XACT_ABORT ON;
            BEGIN TRY BEGIN TRANSACTION;
            IF NOT EXISTS(SELECT 1 FROM dbo.AppUser u WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Role r ON r.Id=u.RoleId
              WHERE u.Id=? AND u.CompanyId=? AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1)
              THROW 50060,'CREATE_USER_FORBIDDEN',1;
            IF EXISTS(SELECT 1 FROM dbo.AppUser WITH(UPDLOCK,HOLDLOCK) WHERE Email=?)
              THROW 50061,'EMAIL_ALREADY_EXISTS',1;
            DECLARE @Created TABLE(Id int);
            INSERT INTO dbo.AppUser
            (
                CompanyId,
                RoleId,
                FirstName,
                LastName,
                Email,
                PasswordHash,
                Phone,
                Rut,
                IsActive,
                MustChangePassword
            )
            OUTPUT
                INSERTED.Id INTO @Created
            VALUES
            (
                ?,
                (SELECT Id FROM dbo.Role WHERE Name = ? AND IsActive = 1),
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                1,
                1
            );
            INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,Reason,CreatedAt)
              SELECT ?,?,N'CREATE_USER',N'APPUSER',Id,?,SYSUTCDATETIME() FROM @Created;
            COMMIT TRANSACTION;
            SELECT u.Id,u.CompanyId,u.RoleId,u.FirstName,u.LastName,u.Email,u.Phone,u.IsActive,u.CreatedAt
              FROM dbo.AppUser u JOIN @Created c ON c.Id=u.Id;
            END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;
            `,
            [
                input.actorId,input.companyId,normalizedEmail,
                input.companyId,
                input.role,
                input.firstName.trim(),
                input.lastName.trim(),
                normalizedEmail,
                passwordHash,
                input.phone?.trim() || null,
                input.rut??null,
                input.companyId,input.actorId,`Cuenta creada con rol ${input.role}.`,
            ]
        );

    return rows[0];
}
