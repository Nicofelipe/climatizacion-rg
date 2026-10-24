import { executeQuery } from '../database/sqlServer';

export async function reviewExpenses(input: {
  companyId: number; reviewerId: number; expenseIds: number[];
  decision: 'APPROVED' | 'REJECTED'; reason: string | null;
}) {
  const placeholders = input.expenseIds.map(() => '?').join(',');
  return executeQuery<{ Id: number }>(`
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
      BEGIN TRANSACTION;
      IF NOT EXISTS (
        SELECT 1 FROM dbo.AppUser u JOIN dbo.Role r ON r.Id = u.RoleId
        WHERE u.Id = ? AND u.CompanyId = ? AND u.IsActive = 1
          AND r.Name = N'ADMIN' AND r.IsActive = 1
      ) THROW 50010, 'REVIEW_FORBIDDEN', 1;

      DECLARE @Reviewer int=?, @Company int=?, @Decision nvarchar(20)=?, @AdminCount int;
      SELECT @AdminCount=COUNT(*) FROM dbo.AppUser u WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Role r ON r.Id=u.RoleId
        WHERE u.CompanyId=@Company AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1;
      IF EXISTS(SELECT 1 FROM dbo.Expense WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=@Company
        AND IsDeleted=0 AND UserId=@Reviewer AND Id IN (${placeholders}))
        AND (@AdminCount<>1 OR @Decision<>N'APPROVED')
        THROW 50012,'SELF_REVIEW_FORBIDDEN',1;

      DECLARE @Changed TABLE (Id int);
      UPDATE dbo.Expense
      SET Status = ?, RejectionReason = ?, ReviewedByUserId = ?,
          ReviewedAt = SYSUTCDATETIME(), UpdatedAt = SYSDATETIME()
      OUTPUT INSERTED.Id INTO @Changed
      WHERE CompanyId = ? AND IsDeleted = 0 AND Status = N'PENDING'
        AND DriveSyncPending=0
        AND Id IN (${placeholders});

      IF (SELECT COUNT(*) FROM @Changed) <> ?
        THROW 50011, 'REVIEW_CONFLICT', 1;

      INSERT INTO dbo.AuditLog (CompanyId, UserId, Action, Entity, EntityId,Reason,CreatedAt)
      SELECT ?, ?, CASE WHEN e.UserId=@Reviewer THEN N'SELF_APPROVE_EXPENSE' ELSE ? END, N'EXPENSE', c.Id,
        CASE WHEN e.UserId=@Reviewer THEN N'Confirmación propia: único administrador activo de la empresa.' ELSE NULL END,SYSUTCDATETIME()
        FROM @Changed c JOIN dbo.Expense e ON e.Id=c.Id AND e.CompanyId=@Company;
      INSERT INTO dbo.UserNotification(CompanyId,UserId,ExpenseId,Kind,EventKey)
        SELECT e.CompanyId,e.UserId,e.Id,@Decision,CONCAT(N'REVIEW:',e.Id,N':',@Decision)
        FROM @Changed c JOIN dbo.Expense e ON e.Id=c.Id AND e.CompanyId=@Company;
      UPDATE dbo.UserNotification SET ReadAt=COALESCE(ReadAt,SYSUTCDATETIME()) WHERE CompanyId=@Company AND Kind=N'PENDING_REVIEW' AND ExpenseId IN(SELECT Id FROM @Changed);
      COMMIT TRANSACTION;
      SELECT Id FROM @Changed ORDER BY Id;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
      THROW;
    END CATCH;
  `, [input.reviewerId, input.companyId,input.reviewerId,input.companyId,input.decision,...input.expenseIds, input.decision, input.reason, input.reviewerId,
    input.companyId, ...input.expenseIds, input.expenseIds.length,
    input.companyId, input.reviewerId, input.decision === 'APPROVED' ? 'APPROVE_EXPENSE' : 'REJECT_EXPENSE']);
}
