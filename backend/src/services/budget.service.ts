import { executeQuery } from '../database/sqlServer';

export interface BudgetRow { UserId: number | null; MonthlyAmount: number; UpdatedAt: string }

/** Presupuesto mensual de la empresa (userId null) o de un integrante. */
export async function getBudget(companyId: number, userId: number | null) {
  const rows = await executeQuery<{ MonthlyAmount: number }>(
    'SELECT MonthlyAmount FROM dbo.Budget WHERE CompanyId=? AND ((? IS NULL AND UserId IS NULL) OR UserId=?);', [companyId, userId, userId]);
  return rows[0] ? Number(rows[0].MonthlyAmount) : null;
}

export async function listBudgets(companyId: number) {
  const rows = await executeQuery<{ UserId: number | null; MonthlyAmount: number }>('SELECT UserId,MonthlyAmount FROM dbo.Budget WHERE CompanyId=?;', [companyId]);
  return rows.map(row => ({ userId: row.UserId, monthlyAmount: Number(row.MonthlyAmount) }));
}

/** Asigna o quita (amount null) un presupuesto. Queda en el historial quién lo cambió y el monto anterior. */
export async function setBudget(input: { companyId: number; actorId: number; userId: number | null; amount: number | null }) {
  await executeQuery(`SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY BEGIN TRANSACTION;
    DECLARE @Company int=?,@Actor int=?,@User int=?,@Amount decimal(18,0)=?,@Before decimal(18,0);
    IF NOT EXISTS(SELECT 1 FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId WHERE u.Id=@Actor AND u.CompanyId=@Company AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1)
      THROW 50110,'BUDGET_FORBIDDEN',1;
    IF @User IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.AppUser WHERE Id=@User AND CompanyId=@Company AND IsActive=1)
      THROW 50111,'BUDGET_USER_NOT_FOUND',1;
    SELECT @Before=MonthlyAmount FROM dbo.Budget WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=@Company AND ((@User IS NULL AND UserId IS NULL) OR UserId=@User);
    IF @Amount IS NULL DELETE FROM dbo.Budget WHERE CompanyId=@Company AND ((@User IS NULL AND UserId IS NULL) OR UserId=@User);
    ELSE IF @Before IS NULL INSERT INTO dbo.Budget(CompanyId,UserId,MonthlyAmount,UpdatedByUserId) VALUES(@Company,@User,@Amount,@Actor);
    ELSE UPDATE dbo.Budget SET MonthlyAmount=@Amount,UpdatedByUserId=@Actor,UpdatedAt=SYSUTCDATETIME() WHERE CompanyId=@Company AND ((@User IS NULL AND UserId IS NULL) OR UserId=@User);
    INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,BeforeData,AfterData,CreatedAt)
      VALUES(@Company,@Actor,N'SET_BUDGET',N'BUDGET',@User,CONVERT(nvarchar(30),@Before),CONVERT(nvarchar(30),@Amount),SYSUTCDATETIME());
    COMMIT TRANSACTION; SELECT 1 AS Saved;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,
    [input.companyId, input.actorId, input.userId, input.amount]);
}
