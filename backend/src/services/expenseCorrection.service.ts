import { executeQuery } from '../database/sqlServer';
import { moveExpenseFileInGoogleDrive } from './googleDrive.service';

export interface CorrectionInput {
  companyId: number; userId: number; expenseId: number;
  expenseDate: string; totalAmount: number; reason: string;
  expectedDate: string; expectedAmount: number;
}

export async function correctExpense(input: CorrectionInput) {
  const net = Math.round(input.totalAmount / 1.19);
  return executeQuery<{ Id: number }>(`
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
      BEGIN TRANSACTION;
      IF NOT EXISTS (SELECT 1 FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId
        WHERE u.Id=? AND u.CompanyId=? AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1)
        THROW 50020, 'CORRECTION_FORBIDDEN', 1;
      DECLARE @Before nvarchar(max), @After nvarchar(max);
      SELECT @Before=(SELECT ExpenseDate,TotalAmount,NetAmount,VatAmount,Status FROM dbo.Expense WITH (UPDLOCK,HOLDLOCK)
        WHERE Id=? AND CompanyId=? AND IsDeleted=0 AND ExpenseDate=CONVERT(date,?) AND TotalAmount=?
        AND Status=N'APPROVED' AND DriveSyncPending=0 FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
      IF @Before IS NULL THROW 50021, 'CORRECTION_CONFLICT', 1;
      IF JSON_VALUE(@Before,'$.ExpenseDate')= ? AND CONVERT(decimal(18,2),JSON_VALUE(@Before,'$.TotalAmount'))=?
        THROW 50022, 'CORRECTION_UNCHANGED', 1;
      UPDATE dbo.Expense SET ExpenseDate=?,TotalAmount=?,NetAmount=?,VatAmount=?,
        UpdatedAt=SYSDATETIME(),DriveSyncPending=CASE WHEN ExpenseDate<>CONVERT(date,?) THEN 1 ELSE 0 END
        WHERE Id=? AND CompanyId=?;
      SELECT @After=(SELECT ExpenseDate,TotalAmount,NetAmount,VatAmount,Status FROM dbo.Expense
        WHERE Id=? AND CompanyId=? FOR JSON PATH,WITHOUT_ARRAY_WRAPPER);
      INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,Reason,CreatedAt)
        VALUES(?,?,N'CORRECT_EXPENSE',N'EXPENSE',?,@Before,@After,?,SYSUTCDATETIME());
      COMMIT TRANSACTION;
      SELECT ? AS Id;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
      THROW;
    END CATCH;
  `, [input.userId,input.companyId,input.expenseId,input.companyId,input.expectedDate,input.expectedAmount,
    input.expenseDate,input.totalAmount,input.expenseDate,input.totalAmount,net,input.totalAmount-net,input.expenseDate,
    input.expenseId,input.companyId,input.expenseId,input.companyId,input.companyId,input.userId,input.expenseId,
    input.reason,input.expenseId]);
}

export async function syncCorrectedExpense(companyId: number, expenseId: number) {
  const rows = await executeQuery<{ ExpenseDate: Date | string; ProviderFileId: string | null; Provider: string | null }>(`
    SELECT e.ExpenseDate,f.ProviderFileId,f.Provider FROM dbo.Expense e LEFT JOIN dbo.[File] f
      ON f.CompanyId=e.CompanyId AND f.EntityType=N'EXPENSE' AND f.EntityId=e.Id
    WHERE e.Id=? AND e.CompanyId=? AND e.IsDeleted=0 AND e.DriveSyncPending=1;
  `,[expenseId,companyId]);
  const row=rows[0];
  if (!row) return;
  if (!row.ProviderFileId || row.Provider!=='GOOGLE_DRIVE') throw new Error('DRIVE_FILE_UNAVAILABLE');
  const date=row.ExpenseDate instanceof Date ? row.ExpenseDate.toISOString().slice(0,10) : row.ExpenseDate.slice(0,10);
  await moveExpenseFileInGoogleDrive({companyId,expenseId,fileId:row.ProviderFileId,expenseDate:date});
  await executeQuery('UPDATE dbo.Expense SET DriveSyncPending=0 WHERE Id=? AND CompanyId=? AND ExpenseDate=CONVERT(date,?);',[expenseId,companyId,date]);
}

export async function getExpenseHistory(companyId: number, expenseId: number) {
  return executeQuery<{ Id: number; Action: string; Actor: string; CreatedAt: string; BeforeData: string | null; AfterData: string | null; Reason: string | null }>(`
    SELECT a.Id,a.Action,u.FirstName+N' '+u.LastName AS Actor,
      CONVERT(varchar(33),a.CreatedAt,126) AS CreatedAt,a.BeforeData,a.AfterData,a.Reason
    FROM dbo.AuditLog a LEFT JOIN dbo.AppUser u ON u.Id=a.UserId AND u.CompanyId=a.CompanyId
    WHERE a.CompanyId=? AND a.Entity=N'EXPENSE' AND a.EntityId=? ORDER BY a.Id DESC;
  `,[companyId,expenseId]);
}
