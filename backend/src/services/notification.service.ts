import {createHash} from 'node:crypto';
import {executeQuery} from '../database/sqlServer';
import {encryptSecret} from '../utils/encryption';
export interface NotificationRow{Id:number;ExpenseId:number;Kind:'PENDING_REVIEW'|'APPROVED'|'REJECTED';CreatedAt:string;ReadAt:string|null;UnreadCount?:number}
export async function listNotifications(companyId:number,userId:number,admin:boolean){
 return executeQuery<NotificationRow>(`SELECT TOP 50 n.Id,n.ExpenseId,n.Kind,CONVERT(varchar(33),n.CreatedAt,126)+'Z' AS CreatedAt,
   CASE WHEN n.ReadAt IS NULL THEN NULL ELSE CONVERT(varchar(33),n.ReadAt,126)+'Z' END AS ReadAt,
   COUNT(CASE WHEN n.ReadAt IS NULL THEN 1 END) OVER() AS UnreadCount
   FROM dbo.UserNotification n JOIN dbo.Expense e ON e.Id=n.ExpenseId AND e.CompanyId=n.CompanyId
   WHERE n.CompanyId=? AND n.UserId=? AND n.ReadAt IS NULL AND e.IsDeleted=0 AND (n.Kind<>N'PENDING_REVIEW' OR (?=1 AND e.Status=N'PENDING'))
   ORDER BY n.Id DESC;`,[companyId,userId,admin?1:0]);
}
export async function readNotification(companyId:number,userId:number,id:number,admin:boolean){
 return executeQuery<NotificationRow>(`UPDATE dbo.UserNotification SET ReadAt=COALESCE(ReadAt,SYSUTCDATETIME())
   OUTPUT INSERTED.Id,INSERTED.ExpenseId,INSERTED.Kind,INSERTED.CreatedAt,INSERTED.ReadAt
   WHERE Id=? AND CompanyId=? AND UserId=? AND (Kind<>N'PENDING_REVIEW' OR ?=1);`,[id,companyId,userId,admin?1:0]);
}
export async function registerPushDevice(companyId:number,userId:number,token:string,version:number,registrationId:string){
 const hash=createHash('sha256').update(token).digest('hex'),encrypted=encryptSecret(token);
 await executeQuery(`SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
   IF NOT EXISTS(SELECT 1 FROM dbo.AppUser u JOIN dbo.Company c ON c.Id=u.CompanyId
     WHERE u.Id=? AND u.CompanyId=? AND u.IsActive=1 AND c.IsActive=1 AND u.PasswordVersion=?) THROW 50090,'PUSH_SESSION_INVALID',1;
   IF EXISTS(SELECT 1 FROM dbo.PushDevice WITH(UPDLOCK,HOLDLOCK) WHERE TokenHash=?)
     UPDATE dbo.PushDevice SET CompanyId=?,UserId=?,EncryptedToken=?,SessionVersion=?,RegistrationId=?,IsActive=1,LastSeenAt=SYSUTCDATETIME() WHERE TokenHash=?;
   ELSE INSERT INTO dbo.PushDevice(CompanyId,UserId,TokenHash,EncryptedToken,SessionVersion,RegistrationId) VALUES(?,?,?,?,?,?);
   COMMIT TRANSACTION; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,
   [userId,companyId,version,hash,companyId,userId,encrypted,version,registrationId,hash,companyId,userId,hash,encrypted,version,registrationId]);
}
export async function unregisterPushDevice(companyId:number,userId:number,token:string,registrationId:string){
 await executeQuery('UPDATE dbo.PushDevice SET IsActive=0 WHERE TokenHash=? AND CompanyId=? AND UserId=? AND RegistrationId=?;',
 [createHash('sha256').update(token).digest('hex'),companyId,userId,registrationId]);
}
