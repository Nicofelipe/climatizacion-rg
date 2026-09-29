import { executeQuery } from '../database/sqlServer';

interface CreateExpenseFileInput {
    companyId: number;
    expenseId: number;
    fileName: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
}

interface CreatedFileRow {
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
}

export async function createExpenseFile(
    input: CreateExpenseFileInput
) {
    const rows = await executeQuery<CreatedFileRow>(
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
        INSERTED.CreatedAt
      VALUES
      (
        ?,
        N'EXPENSE',
        ?,
        N'LOCAL',
        ?,
        ?,
        ?,
        ?
      );
    `,
        [
            input.companyId,
            input.expenseId,
            input.fileName,
            input.originalFileName,
            input.mimeType,
            input.fileSize,
        ]
    );

    return rows[0];
}