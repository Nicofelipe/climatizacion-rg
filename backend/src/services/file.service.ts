import { executeQuery } from '../database/sqlServer';

export type FileProvider = 'LOCAL' | 'GOOGLE_DRIVE';

export interface ExpenseFileInput {
  companyId: number; expenseId: number; provider: FileProvider; providerFileId: string;
  originalFileName: string; mimeType: string; fileSize: number; contentHash?: string | null;
}

export interface ExpenseFileRow {
  Id: number; CompanyId: number; EntityType: string; EntityId: number; Provider: FileProvider; ProviderFileId: string;
  OriginalFileName: string; MimeType: string | null; FileSize: number | null; ContentHash: string | null;
  CreatedAt: string; UpdatedAt: Date | string | null;
}

const columns = ['Id', 'CompanyId', 'EntityType', 'EntityId', 'Provider', 'ProviderFileId', 'OriginalFileName', 'MimeType', 'FileSize', 'ContentHash', 'CreatedAt', 'UpdatedAt'];
const inserted = columns.map(name => `INSERTED.${name}`).join(',');

export async function createExpenseFile(input: ExpenseFileInput) {
  const rows = await executeQuery<ExpenseFileRow>(`
    INSERT INTO dbo.[File](CompanyId,EntityType,EntityId,Provider,ProviderFileId,OriginalFileName,MimeType,FileSize,ContentHash)
    OUTPUT ${inserted} VALUES(?,N'EXPENSE',?,?,?,?,?,?,?);`,
    [input.companyId, input.expenseId, input.provider, input.providerFileId, input.originalFileName.slice(0, 255),
      input.mimeType, input.fileSize, input.contentHash ?? null]);
  return rows[0];
}

export async function getExpenseFile(companyId: number, expenseId: number) {
  const rows = await executeQuery<ExpenseFileRow>(`SELECT TOP 1 ${columns.join(',')} FROM dbo.[File]
    WHERE CompanyId=? AND EntityType=N'EXPENSE' AND EntityId=? ORDER BY Id DESC;`, [companyId, expenseId]);
  return rows[0] ?? null;
}

/** La misma foto no puede respaldar dos boletas vigentes de la empresa. */
export async function isReceiptImageUsed(companyId: number, contentHash: string, exceptExpenseId = 0) {
  const rows = await executeQuery<{ Id: number }>(`SELECT TOP 1 f.Id FROM dbo.[File] f
    JOIN dbo.Expense e ON e.Id=f.EntityId AND e.CompanyId=f.CompanyId
    WHERE f.CompanyId=? AND f.ContentHash=? AND f.EntityType=N'EXPENSE' AND e.Id<>? AND e.IsDeleted=0 AND e.Status<>N'REJECTED';`,
    [companyId, contentHash, exceptExpenseId]);
  return rows.length > 0;
}

export async function updateExpenseFile(input: ExpenseFileInput & { updatedAt?: Date | string | null }) {
  const restore = input.updatedAt !== undefined;
  const rows = await executeQuery<ExpenseFileRow>(`
    UPDATE dbo.[File] SET Provider=?,ProviderFileId=?,OriginalFileName=?,MimeType=?,FileSize=?,ContentHash=?,UpdatedAt=${restore ? '?' : 'SYSDATETIME()'}
    OUTPUT ${inserted} WHERE CompanyId=? AND EntityType=N'EXPENSE' AND EntityId=?;`,
    [input.provider, input.providerFileId, input.originalFileName.slice(0, 255), input.mimeType, input.fileSize, input.contentHash ?? null,
      ...(restore ? [input.updatedAt ?? null] : []), input.companyId, input.expenseId]);
  return rows[0] ?? null;
}

/** Vuelve a apuntar a la foto anterior después de una edición fallida. */
export async function rollbackUpdatedExpenseFile(companyId: number, expenseId: number, previous: ExpenseFileRow) {
  return updateExpenseFile({
    companyId, expenseId, provider: previous.Provider, providerFileId: previous.ProviderFileId,
    originalFileName: previous.OriginalFileName, mimeType: previous.MimeType ?? '', fileSize: previous.FileSize ?? 0,
    contentHash: previous.ContentHash, updatedAt: previous.UpdatedAt ?? null,
  });
}

export async function rollbackCreatedExpenseFile(companyId: number, expenseId: number) {
  await executeQuery(`DELETE FROM dbo.[File] WHERE CompanyId=? AND EntityType=N'EXPENSE' AND EntityId=?;`, [companyId, expenseId]);
}
