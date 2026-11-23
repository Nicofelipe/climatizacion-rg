import { executeQuery } from '../database/sqlServer';
import { receiptTax, VatSource } from '../utils/receiptTax';
import type { FileProvider } from './file.service';
import { relocateStoredReceipt } from './receiptStorage.service';

export interface CorrectionInput {
  companyId: number; userId: number; expenseId: number;
  expenseDate: string; totalAmount: number; reason: string;
  expectedDate: string; expectedAmount: number;
  /** IVA resultante. Sin indicarlo se conserva la modalidad calculada al 19%. */
  vatSource?: VatSource; vatAmount?: number | null;
  /** Modalidad que vio el administrador, para no pisar un cambio simultáneo. */
  expectedVatSource?: VatSource;
}

export async function correctExpense(input: CorrectionInput) {
  const tax = receiptTax(input.totalAmount, input.vatSource ?? 'CALCULATED', input.vatAmount);
  return executeQuery<{ Id: number }>(`
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
      BEGIN TRANSACTION;
      DECLARE @User int=?,@Company int=?,@Id int=?,@Date date=?,@Total decimal(18,2)=?,@Net decimal(18,2)=?,@Vat decimal(18,2)=?,
        @Source nvarchar(12)=?,@Rate decimal(5,2)=?,@ExpectedDate date=?,@ExpectedTotal decimal(18,2)=?,@ExpectedSource nvarchar(12)=?;
      IF NOT EXISTS (SELECT 1 FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId
        WHERE u.Id=@User AND u.CompanyId=@Company AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1)
        THROW 50020, 'CORRECTION_FORBIDDEN', 1;
      DECLARE @Before nvarchar(max),@After nvarchar(max);
      SELECT @Before=(SELECT ExpenseDate,TotalAmount,NetAmount,VatAmount,VatSource,Status FROM dbo.Expense WITH(UPDLOCK,HOLDLOCK)
        WHERE Id=@Id AND CompanyId=@Company AND IsDeleted=0 AND ExpenseDate=@ExpectedDate AND TotalAmount=@ExpectedTotal
        AND (@ExpectedSource IS NULL OR VatSource=@ExpectedSource)
        AND Status=N'APPROVED' AND DriveSyncPending=0 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
      IF @Before IS NULL THROW 50021, 'CORRECTION_CONFLICT', 1;
      IF EXISTS(SELECT 1 FROM dbo.Expense WHERE Id=@Id AND CompanyId=@Company AND ExpenseDate=@Date AND TotalAmount=@Total AND VatAmount=@Vat AND VatSource=@Source)
        THROW 50022, 'CORRECTION_UNCHANGED', 1;
      UPDATE dbo.Expense SET ExpenseDate=@Date,TotalAmount=@Total,NetAmount=@Net,VatAmount=@Vat,VatSource=@Source,TaxRate=@Rate,
        UpdatedAt=SYSDATETIME(),DriveSyncPending=CASE WHEN ExpenseDate<>@Date THEN 1 ELSE 0 END
        WHERE Id=@Id AND CompanyId=@Company;
      SELECT @After=(SELECT ExpenseDate,TotalAmount,NetAmount,VatAmount,VatSource,Status FROM dbo.Expense
        WHERE Id=@Id AND CompanyId=@Company FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
      INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,Reason,CreatedAt)
        VALUES(@Company,@User,N'CORRECT_EXPENSE',N'EXPENSE',@Id,@Before,@After,?,SYSUTCDATETIME());
      COMMIT TRANSACTION;
      SELECT @Id AS Id;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
      THROW;
    END CATCH;
  `, [input.userId, input.companyId, input.expenseId, input.expenseDate, input.totalAmount, tax.net, tax.vat, tax.source, tax.taxRate,
    input.expectedDate, input.expectedAmount, input.expectedVatSource ?? null, input.reason]);
}

export async function syncCorrectedExpense(companyId: number, expenseId: number) {
  const rows = await executeQuery<{ ExpenseDate: Date | string; ProviderFileId: string | null; Provider: FileProvider | null }>(`
    SELECT e.ExpenseDate,f.ProviderFileId,f.Provider FROM dbo.Expense e LEFT JOIN dbo.[File] f
      ON f.CompanyId=e.CompanyId AND f.EntityType=N'EXPENSE' AND f.EntityId=e.Id
    WHERE e.Id=? AND e.CompanyId=? AND e.IsDeleted=0 AND e.DriveSyncPending=1;
  `, [expenseId, companyId]);
  const row = rows[0];
  if (!row) return;
  if (!row.ProviderFileId || !row.Provider) throw new Error('DRIVE_FILE_UNAVAILABLE');
  const date = row.ExpenseDate instanceof Date ? row.ExpenseDate.toISOString().slice(0, 10) : row.ExpenseDate.slice(0, 10);
  await relocateStoredReceipt({ companyId, expenseId, provider: row.Provider, fileId: row.ProviderFileId, expenseDate: date });
  await executeQuery('UPDATE dbo.Expense SET DriveSyncPending=0 WHERE Id=? AND CompanyId=? AND ExpenseDate=CONVERT(date,?);', [expenseId, companyId, date]);
}

export async function getExpenseHistory(companyId: number, expenseId: number) {
  return executeQuery<{ Id: number; Action: string; Actor: string; CreatedAt: string; BeforeData: string | null; AfterData: string | null; Reason: string | null }>(`
    SELECT a.Id,a.Action,u.FirstName+N' '+u.LastName AS Actor,
      CONVERT(varchar(33),a.CreatedAt,126) AS CreatedAt,a.BeforeData,a.AfterData,a.Reason
    FROM dbo.AuditLog a LEFT JOIN dbo.AppUser u ON u.Id=a.UserId AND u.CompanyId=a.CompanyId
    WHERE a.CompanyId=? AND a.Entity=N'EXPENSE' AND a.EntityId=? ORDER BY a.Id DESC;
  `, [companyId, expenseId]);
}
