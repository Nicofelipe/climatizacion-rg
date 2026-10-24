import { executeQuery } from '../database/sqlServer';

export async function getPendingReviews(companyId:number,userId:number){
  return executeQuery<{Id:number}>(`
    WITH ActiveAdmins AS (
      SELECT u.Id FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId
      WHERE u.CompanyId=? AND u.IsActive=1 AND r.Name=N'ADMIN' AND r.IsActive=1
    )
    SELECT e.Id FROM dbo.Expense e
    WHERE e.CompanyId=? AND e.IsDeleted=0 AND e.Status=N'PENDING'
      AND EXISTS(SELECT 1 FROM ActiveAdmins WHERE Id=?)
      AND (e.UserId<>? OR (SELECT COUNT(*) FROM ActiveAdmins)=1)
    ORDER BY e.Id DESC;
  `,[companyId,companyId,userId,userId]);
}
