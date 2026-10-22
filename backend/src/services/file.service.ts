import { executeQuery } from '../database/sqlServer';

interface CreateExpenseFileInput {
    companyId: number;
    expenseId: number;
    provider: 'LOCAL' | 'GOOGLE_DRIVE';
    providerFileId: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
}

interface ExpenseFileRow {
    Id: number;
    CompanyId: number;
    EntityType: string;
    EntityId: number;
    Provider: string;
    ProviderFileId: string;
    OriginalFileName: string;
    MimeType: string | null;
    FileSize: number | null;
    CreatedAt: string;
    UpdatedAt: string | null;
}

interface UpdateExpenseFileInput {
    companyId: number;
    expenseId: number;
    provider: 'LOCAL' | 'GOOGLE_DRIVE';
    providerFileId: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
}

export async function createExpenseFile(
    input: CreateExpenseFileInput
) {
    const rows = await executeQuery<ExpenseFileRow>(
        `
    INSERT INTO dbo.[File]
    (
      CompanyId,
      EntityType,
      EntityId,
      Provider,
      ProviderFileId,
      OriginalFileName,
      MimeType,
      FileSize
    )
    OUTPUT
      INSERTED.Id,
      INSERTED.CompanyId,
      INSERTED.EntityType,
      INSERTED.EntityId,
      INSERTED.Provider,
      INSERTED.ProviderFileId,
      INSERTED.OriginalFileName,
      INSERTED.MimeType,
      INSERTED.FileSize,
      INSERTED.CreatedAt,
      INSERTED.UpdatedAt
    VALUES
    (
      ?,
      N'EXPENSE',
      ?,
      ?,
      ?,
      ?,
      ?,
      ?
    );
  `,
        [
            input.companyId,
            input.expenseId,
            input.provider,
            input.providerFileId,
            input.originalFileName,
            input.mimeType,
            input.fileSize,
        ]
    );

    return rows[0];
}

export async function getExpenseFile(
    companyId: number,
    expenseId: number
) {
    const rows = await executeQuery<ExpenseFileRow>(
        `
      SELECT TOP 1
        Id,
        CompanyId,
        EntityType,
        EntityId,
        Provider,
        ProviderFileId,
        OriginalFileName,
        MimeType,
        FileSize,
        CreatedAt,
        UpdatedAt
      FROM dbo.[File]
      WHERE CompanyId = ?
        AND EntityType = N'EXPENSE'
        AND EntityId = ?
      ORDER BY Id DESC;
    `,
        [
            companyId,
            expenseId,
        ]
    );

    return rows[0] ?? null;
}




export async function updateExpenseFile(
    input: UpdateExpenseFileInput
) {
    const rows = await executeQuery<ExpenseFileRow>(
        `
      UPDATE dbo.[File]
      SET
        Provider = ?,
        ProviderFileId = ?,
        OriginalFileName = ?,
        MimeType = ?,
        FileSize = ?,
        UpdatedAt = SYSDATETIME()
      OUTPUT
        INSERTED.Id,
        INSERTED.CompanyId,
        INSERTED.EntityType,
        INSERTED.EntityId,
        INSERTED.Provider,
        INSERTED.ProviderFileId,
        INSERTED.OriginalFileName,
        INSERTED.MimeType,
        INSERTED.FileSize,
        INSERTED.CreatedAt,
        INSERTED.UpdatedAt
      WHERE CompanyId = ?
        AND EntityType = N'EXPENSE'
        AND EntityId = ?;
    `,
        [
            input.provider,
            input.providerFileId,
            input.originalFileName,
            input.mimeType,
            input.fileSize,

            input.companyId,
            input.expenseId,
        ]
    );

    return rows[0] ?? null;
}

interface RollbackUpdatedExpenseFileInput {
    companyId: number;
    expenseId: number;
    provider: string;
    providerFileId: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    updatedAt?: Date | string | null;
}

export async function rollbackUpdatedExpenseFile(
    input: RollbackUpdatedExpenseFileInput
) {
    const rows = await executeQuery(
        `
        UPDATE dbo.[File]
        SET
            Provider = ?,
            ProviderFileId = ?,
            OriginalFileName = ?,
            MimeType = ?,
            FileSize = ?,
            UpdatedAt = ?
        OUTPUT
            INSERTED.Id,
            INSERTED.CompanyId,
            INSERTED.EntityType,
            INSERTED.EntityId,
            INSERTED.Provider,
            INSERTED.ProviderFileId,
            INSERTED.OriginalFileName,
            INSERTED.MimeType,
            INSERTED.FileSize,
            INSERTED.CreatedAt,
            INSERTED.UpdatedAt
        WHERE CompanyId = ?
          AND EntityType = N'EXPENSE'
          AND EntityId = ?;
        `,
        [
            input.provider,
            input.providerFileId,
            input.originalFileName,
            input.mimeType,
            input.fileSize,
            input.updatedAt ?? null,
            input.companyId,
            input.expenseId,
        ]
    );

    return rows[0] ?? null;
}

export async function rollbackCreatedExpenseFile(
    companyId: number,
    expenseId: number
) {
    await executeQuery(
        `
        DELETE FROM dbo.[File]
        WHERE CompanyId = ?
          AND EntityType = N'EXPENSE'
          AND EntityId = ?;
        `,
        [
            companyId,
            expenseId,
        ]
    );
}