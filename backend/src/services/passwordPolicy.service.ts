import bcrypt from 'bcryptjs';
import { executeQuery } from '../database/sqlServer';
import { generateAccessToken } from './token.service';
import { validNewPassword } from '../utils/passwordRequirements';

export interface PasswordAccount{Id:number;CompanyId:number;FirstName:string;LastName:string;Email:string;RoleName:'ADMIN'|'EMPLOYEE';MustChangePassword:boolean;Deadline:string|null;PasswordVersion:number;PasswordHash?:string}
export function passwordPolicy(account:Pick<PasswordAccount,'MustChangePassword'|'Deadline'>,now=Date.now()){
  const deadline=account.MustChangePassword?account.Deadline:null;
  const remainingSeconds=deadline?Math.max(0,Math.ceil((Date.parse(deadline)-now)/1000)):null;
  return {mustChangePassword:Boolean(account.MustChangePassword),deadline,remainingSeconds,expired:Boolean(account.MustChangePassword&&deadline&&Date.parse(deadline)<=now)};
}
export async function getPasswordAccount(companyId:number,userId:number){
  const rows=await executeQuery<PasswordAccount>(`SELECT u.Id,u.CompanyId,u.FirstName,u.LastName,u.Email,u.PasswordHash,u.MustChangePassword,u.PasswordVersion,r.Name AS RoleName,
    CASE WHEN u.FirstLoginAt IS NULL THEN NULL ELSE CONVERT(varchar(33),DATEADD(hour,48,u.FirstLoginAt),126)+'Z' END AS Deadline
    FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId JOIN dbo.Company c ON c.Id=u.CompanyId
    WHERE u.Id=? AND u.CompanyId=? AND u.IsActive=1 AND r.IsActive=1 AND c.IsActive=1 AND r.Name IN(N'ADMIN',N'EMPLOYEE');`,[userId,companyId]);
  return rows[0]??null;
}
export async function recordSuccessfulLogin(companyId:number,userId:number,method:'PASSWORD'|'GOOGLE'){
  await executeQuery(`SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
    UPDATE dbo.AppUser SET FirstLoginAt=SYSUTCDATETIME() WHERE Id=? AND CompanyId=? AND IsActive=1 AND FirstLoginAt IS NULL;
    IF @@ROWCOUNT=1 INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,CreatedAt)
      VALUES(?,?,N'FIRST_LOGIN',N'APPUSER',?,SYSUTCDATETIME());
    INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,Reason,CreatedAt)
      VALUES(?,?,N'LOGIN',N'APPUSER',?,?,SYSUTCDATETIME());
    COMMIT TRANSACTION; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;
  `,[userId,companyId,companyId,userId,userId,companyId,userId,userId,method]);
  const account=await getPasswordAccount(companyId,userId);
  if(!account)throw new Error('ACCOUNT_UNAVAILABLE');
  return account;
}
export function passwordSession(account:PasswordAccount){
  return {user:{id:account.Id,companyId:account.CompanyId,firstName:account.FirstName,lastName:account.LastName,email:account.Email,role:account.RoleName,passwordPolicy:passwordPolicy(account)},
    token:generateAccessToken({userId:account.Id,companyId:account.CompanyId,role:account.RoleName,passwordVersion:account.PasswordVersion})};
}
const failures=new Map<string,{count:number;until:number}>();
export async function changePassword(companyId:number,userId:number,current:string,next:string){
  if(typeof current!=='string'||!validNewPassword(next)||Buffer.byteLength(current,'utf8')>72)throw new Error('PASSWORD_FORMAT');
  const key=`${companyId}:${userId}`,now=Date.now();
  for(const [entry,value] of failures)if(value.until<now)failures.delete(entry);
  if((failures.get(key)?.count??0)>=5)throw new Error('PASSWORD_RATE_LIMIT');
  const account=await getPasswordAccount(companyId,userId);
  if(!account?.PasswordHash)throw new Error('ACCOUNT_UNAVAILABLE');
  if(!await bcrypt.compare(current,account.PasswordHash)){
    const value=failures.get(key)??{count:0,until:now+600000};value.count++;failures.set(key,value);throw new Error('CURRENT_PASSWORD_INVALID');
  }
  if(current===next)throw new Error('PASSWORD_UNCHANGED');
  const hash=await bcrypt.hash(next,12);
  await executeQuery(`SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
    UPDATE dbo.AppUser SET PasswordHash=?,MustChangePassword=0,PasswordChangedAt=SYSUTCDATETIME(),PasswordVersion=PasswordVersion+1
      WHERE Id=? AND CompanyId=? AND IsActive=1 AND PasswordHash=? AND PasswordVersion=?;
    IF @@ROWCOUNT<>1 THROW 50050,'PASSWORD_CONFLICT',1;
    INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,Reason,CreatedAt)
      VALUES(?,?,N'CHANGE_PASSWORD',N'APPUSER',?,N'Contraseña cambiada por su titular; sesiones anteriores revocadas.',SYSUTCDATETIME());
    COMMIT TRANSACTION; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;
  `,[hash,userId,companyId,account.PasswordHash,account.PasswordVersion,companyId,userId,userId]);
  failures.delete(key);
  return passwordSession({...account,MustChangePassword:false,Deadline:null,PasswordVersion:account.PasswordVersion+1});
}
