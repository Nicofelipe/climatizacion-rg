import { executeQuery } from '../database/sqlServer';

export async function getApprovalPolicy(companyId:number){
  const rows=await executeQuery<{AdminCount:number}>(`SELECT COUNT(*) AS AdminCount FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId
    WHERE u.CompanyId=? AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1;`,[companyId]);
  return {adminCount:rows[0]?.AdminCount??0,mode:rows[0]?.AdminCount===1?'SOLE_ADMIN':'PEER_REVIEW'};
}

// Called only after both the receipt and its required image exist.
export async function autoApproveSoleAdmin(companyId:number,userId:number,expenseId:number){
  const rows=await executeQuery<{Id:number}>(`SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY BEGIN TRANSACTION;
    DECLARE @Count int; DECLARE @Changed TABLE(Id int);
    SELECT @Count=COUNT(*) FROM dbo.AppUser u WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Role r ON r.Id=u.RoleId
      WHERE u.CompanyId=? AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1;
    IF @Count=1 AND EXISTS(SELECT 1 FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId
      WHERE u.CompanyId=? AND u.Id=? AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1)
    BEGIN
      UPDATE dbo.Expense SET Status=N'APPROVED',ReviewedByUserId=?,ReviewedAt=SYSUTCDATETIME(),UpdatedAt=SYSDATETIME()
      OUTPUT INSERTED.Id INTO @Changed WHERE CompanyId=? AND UserId=? AND Id=? AND Status=N'PENDING' AND IsDeleted=0 AND DriveSyncPending=0
        AND EXISTS(SELECT 1 FROM dbo.[File] f WHERE f.CompanyId=dbo.Expense.CompanyId AND f.EntityId=dbo.Expense.Id AND f.EntityType=N'EXPENSE');
      INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,Reason,CreatedAt)
        SELECT ?,?,N'AUTO_APPROVE_SOLE_ADMIN',N'EXPENSE',Id,N'Aprobación automática: único administrador activo de la empresa al registrar la boleta.',SYSUTCDATETIME() FROM @Changed;
    END;
    COMMIT TRANSACTION; SELECT Id FROM @Changed;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;
  `,[companyId,companyId,userId,userId,companyId,userId,expenseId,companyId,userId]);
  return rows.length>0;
}
