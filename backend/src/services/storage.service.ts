import { executeQuery } from '../database/sqlServer';

interface CompanyStorageRow {
    Id: number;
    CompanyId: number;
    Provider: string;
    RootFolderId: string;
    IsActive: boolean;
    CreatedAt: string;
    UpdatedAt: string | null;
}

export async function getCompanyStorage(companyId: number) {
    const rows = await executeQuery<CompanyStorageRow>(
        `
      SELECT
        Id,
        CompanyId,
        Provider,
        RootFolderId,
        IsActive,
        CreatedAt,
        UpdatedAt
      FROM dbo.CompanyStorage
      WHERE CompanyId = ?
        AND Provider = N'GOOGLE_DRIVE'
        AND IsActive = 1;
    `,
        [companyId]
    );

    return rows[0] ?? null;
}

export async function upsertGoogleDriveStorage(
    companyId: number,
    rootFolderId: string
) {
    const rows = await executeQuery<CompanyStorageRow>(
        `
      IF EXISTS (
        SELECT 1
        FROM dbo.CompanyStorage
        WHERE CompanyId = ?
          AND Provider = N'GOOGLE_DRIVE'
      )
      BEGIN
        UPDATE dbo.CompanyStorage
        SET
          RootFolderId = ?,
          IsActive = 1,
          UpdatedAt = SYSDATETIME()
        OUTPUT
          INSERTED.Id,
          INSERTED.CompanyId,
          INSERTED.Provider,
          INSERTED.RootFolderId,
          INSERTED.IsActive,
          INSERTED.CreatedAt,
          INSERTED.UpdatedAt
        WHERE CompanyId = ?
          AND Provider = N'GOOGLE_DRIVE';
      END
      ELSE
      BEGIN
        INSERT INTO dbo.CompanyStorage
        (
          CompanyId,
          Provider,
          RootFolderId,
          IsActive
        )
        OUTPUT
          INSERTED.Id,
          INSERTED.CompanyId,
          INSERTED.Provider,
          INSERTED.RootFolderId,
          INSERTED.IsActive,
          INSERTED.CreatedAt,
          INSERTED.UpdatedAt
        VALUES
        (
          ?,
          N'GOOGLE_DRIVE',
          ?,
          1
        );
      END;
    `,
        [
            companyId,
            rootFolderId,
            companyId,
            companyId,
            rootFolderId,
        ]
    );

    return rows[0] ?? null;
}