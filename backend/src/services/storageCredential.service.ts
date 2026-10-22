import { executeQuery } from '../database/sqlServer';
import {
    decryptSecret,
    encryptSecret,
} from '../utils/encryption';

interface CompanyStorageCredentialRow {
  Id: number;
  CompanyStorageId: number;
  EncryptedRefreshToken: string;
  CreatedAt: string;
  UpdatedAt: string | null;
}

export async function upsertStorageCredential(
  companyStorageId: number,
  refreshToken: string
) {
  const encryptedRefreshToken =
    encryptSecret(refreshToken);

  const existingRows =
    await executeQuery<CompanyStorageCredentialRow>(
      `
        SELECT
          Id,
          CompanyStorageId,
          EncryptedRefreshToken,
          CreatedAt,
          UpdatedAt
        FROM dbo.CompanyStorageCredential
        WHERE CompanyStorageId = ?;
      `,
      [companyStorageId]
    );

  if (existingRows.length > 0) {
    const rows =
      await executeQuery<CompanyStorageCredentialRow>(
        `
          UPDATE dbo.CompanyStorageCredential
          SET
            EncryptedRefreshToken = ?,
            UpdatedAt = SYSDATETIME()
          OUTPUT
            INSERTED.Id,
            INSERTED.CompanyStorageId,
            INSERTED.EncryptedRefreshToken,
            INSERTED.CreatedAt,
            INSERTED.UpdatedAt
          WHERE CompanyStorageId = ?;
        `,
        [
          encryptedRefreshToken,
          companyStorageId,
        ]
      );

    return rows[0];
  }

  const rows =
    await executeQuery<CompanyStorageCredentialRow>(
      `
        INSERT INTO dbo.CompanyStorageCredential
        (
          CompanyStorageId,
          EncryptedRefreshToken
        )
        OUTPUT
          INSERTED.Id,
          INSERTED.CompanyStorageId,
          INSERTED.EncryptedRefreshToken,
          INSERTED.CreatedAt,
          INSERTED.UpdatedAt
        VALUES (?, ?);
      `,
      [
        companyStorageId,
        encryptedRefreshToken,
      ]
    );

  return rows[0];
}

export async function getStorageRefreshToken(
  companyStorageId: number
): Promise<string | null> {
  const rows =
    await executeQuery<CompanyStorageCredentialRow>(
      `
        SELECT
          Id,
          CompanyStorageId,
          EncryptedRefreshToken,
          CreatedAt,
          UpdatedAt
        FROM dbo.CompanyStorageCredential
        WHERE CompanyStorageId = ?;
      `,
      [companyStorageId]
    );

  const credential = rows[0];

  if (!credential) {
    return null;
  }

  return decryptSecret(
    credential.EncryptedRefreshToken
  );
}