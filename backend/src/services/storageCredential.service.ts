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
  refreshToken: string,
  actor?:{companyId:number;userId:number;passwordVersion:number}
) {
  const encryptedRefreshToken =
    encryptSecret(refreshToken);

  if(actor){
    await executeQuery(`SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
      IF NOT EXISTS(SELECT 1 FROM dbo.AppUser u WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Role r ON r.Id=u.RoleId JOIN dbo.Company c ON c.Id=u.CompanyId
        WHERE u.Id=? AND u.CompanyId=? AND u.IsActive=1 AND r.IsActive=1 AND c.IsActive=1 AND r.Name=N'ADMIN' AND u.PasswordVersion=?)
        THROW 50080,'DRIVE_ADMIN_UNAVAILABLE',1;
      IF NOT EXISTS(SELECT 1 FROM dbo.CompanyStorage WITH(UPDLOCK,HOLDLOCK) WHERE Id=? AND CompanyId=? AND IsActive=1)
        THROW 50081,'DRIVE_STORAGE_UNAVAILABLE',1;
      IF EXISTS(SELECT 1 FROM dbo.CompanyStorageCredential WITH(UPDLOCK,HOLDLOCK) WHERE CompanyStorageId=?)
        UPDATE dbo.CompanyStorageCredential SET EncryptedRefreshToken=?,UpdatedAt=SYSUTCDATETIME() WHERE CompanyStorageId=?;
      ELSE INSERT INTO dbo.CompanyStorageCredential(CompanyStorageId,EncryptedRefreshToken) VALUES(?,?);
      INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,Reason,CreatedAt)
        VALUES(?,?,N'RECONNECT_DRIVE',N'COMPANY_STORAGE',?,N'Autorización de Drive renovada; carpeta fija conservada.',SYSUTCDATETIME());
      COMMIT TRANSACTION; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,
      [actor.userId,actor.companyId,actor.passwordVersion,companyStorageId,actor.companyId,companyStorageId,
        encryptedRefreshToken,companyStorageId,companyStorageId,encryptedRefreshToken,actor.companyId,actor.userId,companyStorageId]);
    return;
  }

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
