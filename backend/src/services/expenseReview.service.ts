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

      DECLARE @Changed TABLE (Id int);
      UPDATE dbo.Expense
      SET Status = ?, RejectionReason = ?, ReviewedByUserId = ?,
          ReviewedAt = SYSUTCDATETIME(), UpdatedAt = SYSDATETIME()
      OUTPUT INSERTED.Id INTO @Changed
      WHERE CompanyId = ? AND IsDeleted = 0 AND Status = N'PENDING'
        AND Id IN (${placeholders});

      IF (SELECT COUNT(*) FROM @Changed) <> ?
        THROW 50011, 'REVIEW_CONFLICT', 1;

      INSERT INTO dbo.AuditLog (CompanyId, UserId, Action, Entity, EntityId)
      SELECT ?, ?, ?, N'EXPENSE', Id FROM @Changed;
      COMMIT TRANSACTION;
      SELECT Id FROM @Changed ORDER BY Id;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
      THROW;
    END CATCH;
  `, [input.reviewerId, input.companyId, input.decision, input.reason, input.reviewerId,
    input.companyId, ...input.expenseIds, input.expenseIds.length,
    input.companyId, input.reviewerId, input.decision === 'APPROVED' ? 'APPROVE_EXPENSE' : 'REJECT_EXPENSE']);
}
