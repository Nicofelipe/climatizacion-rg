import {createHash,randomBytes} from 'node:crypto';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../database/sqlServer';
import { validNewPassword } from '../utils/passwordRequirements';
import { recoveryMailConfigured,sendRecoveryMail } from './recoveryMail.service';
export const resetTokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export const recoveryResponse='Si el correo corresponde a una cuenta activa, recibirás instrucciones para recuperar tu contraseña.';
export async function requestPasswordRecovery(email:string){
  if(!recoveryMailConfigured())throw new Error('RECOVERY_MAIL_NOT_CONFIGURED');
  const base=new URL(process.env.PASSWORD_RESET_URL!);
  if(base.protocol!=='https:'&&!(base.protocol==='http:'&&base.hostname==='localhost'))throw new Error('RECOVERY_MAIL_NOT_CONFIGURED');
  const users=await executeQuery<{Id:number;CompanyId:number;Email:string;PasswordVersion:number}>(`SELECT u.Id,u.CompanyId,u.Email,u.PasswordVersion FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId JOIN dbo.Company c ON c.Id=u.CompanyId
    WHERE u.Email=? AND u.IsActive=1 AND r.IsActive=1 AND c.IsActive=1;`,[email]);
  if(users.length!==1)return;
  const user=users[0]!,token=randomBytes(32).toString('hex'),hash=resetTokenHash(token);
  await executeQuery(`INSERT INTO dbo.PasswordResetToken(CompanyId,UserId,TokenHash,PasswordVersion,RequestedEmail,ExpiresAt)
    VALUES(?,?,?,?,?,DATEADD(minute,20,SYSUTCDATETIME()));`,[user.CompanyId,user.Id,hash,user.PasswordVersion,user.Email]);
  base.hash=`token=${token}`;
  try{await sendRecoveryMail(user.Email,`Solicitaste recuperar tu contraseña. Abre este enlace y elige una nueva:\n\n${base.toString()}\n\nVence en 20 minutos y se puede usar una sola vez. Si no lo solicitaste, ignora este mensaje. No compartas el enlace.`);}
  catch{await executeQuery('UPDATE dbo.PasswordResetToken SET UsedAt=SYSUTCDATETIME() WHERE TokenHash=?;',[hash]);throw new Error('RECOVERY_MAIL_FAILED');}
}
export async function resetPassword(token:string,password:string){
  if(!/^[a-f0-9]{64}$/.test(token))throw new Error('RESET_INVALID');
  if(!validNewPassword(password))throw new Error('PASSWORD_FORMAT');
  const hash=resetTokenHash(token),passwordHash=await bcrypt.hash(password,12);
  const rows=await executeQuery<{Email:string}>(`SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY BEGIN TRANSACTION;
    DECLARE @User int,@Company int,@Email nvarchar(254);
    SELECT @User=u.Id,@Company=u.CompanyId,@Email=u.Email FROM dbo.PasswordResetToken t WITH(UPDLOCK,HOLDLOCK)
      JOIN dbo.AppUser u WITH(UPDLOCK,HOLDLOCK) ON u.Id=t.UserId AND u.CompanyId=t.CompanyId
      JOIN dbo.Role r ON r.Id=u.RoleId JOIN dbo.Company c ON c.Id=u.CompanyId
      WHERE t.TokenHash=? AND t.UsedAt IS NULL AND t.ExpiresAt>SYSUTCDATETIME() AND t.PasswordVersion=u.PasswordVersion AND t.RequestedEmail=u.Email
        AND u.IsActive=1 AND r.IsActive=1 AND c.IsActive=1;
    IF @User IS NULL THROW 50070,'RESET_INVALID',1;
    UPDATE dbo.AppUser SET PasswordHash=?,MustChangePassword=0,PasswordChangedAt=SYSUTCDATETIME(),PasswordVersion=PasswordVersion+1 WHERE Id=@User AND CompanyId=@Company;
    UPDATE dbo.PasswordResetToken SET UsedAt=SYSUTCDATETIME() WHERE UserId=@User AND CompanyId=@Company AND UsedAt IS NULL;
    INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,Reason,CreatedAt)
      VALUES(@Company,@User,N'RESET_PASSWORD',N'APPUSER',@User,N'Recuperación mediante enlace enviado al correo registrado; sesiones anteriores revocadas.',SYSUTCDATETIME());
    COMMIT TRANSACTION;SELECT @Email AS Email;
    END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;THROW;END CATCH;
  `,[hash,passwordHash]);
  if(rows[0]?.Email)try{await sendRecoveryMail(rows[0].Email,'Tu contraseña se restableció. Las sesiones anteriores se cerraron. Si no realizaste este cambio, contacta al responsable de tu empresa inmediatamente.');}catch{/* Password is already changed; never ask to resubmit the consumed link. */}
}
