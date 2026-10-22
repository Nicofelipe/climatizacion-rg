import { createHash, randomBytes } from 'node:crypto';
import { google } from 'googleapis';
import { executeQuery } from '../database/sqlServer';
import { generateAccessToken } from './token.service';
import { recordSuccessfulLogin,passwordSession } from './passwordPolicy.service';

const attempts=new Map<string,{challenge:string;redirect:string;nonce:string;expires:number}>();
const tickets=new Map<string,{challenge:string;subject:string;email:string;authoritative:boolean;expires:number}>();
const random=()=>randomBytes(32).toString('hex');
const clean=()=>{const now=Date.now();for(const [key,value] of attempts)if(value.expires<now)attempts.delete(key);for(const [key,value] of tickets)if(value.expires<now)tickets.delete(key);};
export const loginCallback=()=>process.env.GOOGLE_LOGIN_REDIRECT_URI??`${new URL(process.env.GOOGLE_REDIRECT_URI!).origin}/api/auth/google/callback`;
const client=()=>new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,loginCallback());
export function startGoogleLogin(redirect:string,challenge:string){
  const allowed=(process.env.GOOGLE_LOGIN_APP_REDIRECTS??'http://localhost:8081/google-login,climatizacion-rg://google-login').split(',').map(value=>value.trim());
  if(!allowed.includes(redirect)||!(/^[a-f0-9]{64}$/i.test(challenge)))throw new Error('INVALID_REDIRECT');
  clean();if(attempts.size>=1000)throw new Error('LOGIN_BUSY');
  const state=random(),nonce=random();attempts.set(state,{challenge,redirect,nonce,expires:Date.now()+300000});
  return client().generateAuthUrl({scope:['openid','email','profile'],state,nonce,prompt:'select_account',access_type:'online'});
}
export async function completeGoogleLogin(state:string,code:string|undefined){
  clean();const attempt=attempts.get(state);attempts.delete(state);
  if(!attempt)throw new Error('INVALID_STATE');
  try{
    if(!code)throw new Error('CANCELLED');
    const oauth=client();const {tokens}=await oauth.getToken(code);
    if(!tokens.id_token)throw new Error('INVALID_GOOGLE_TOKEN');
    const verified=await oauth.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_CLIENT_ID});
    const payload=verified.getPayload();
    if(!payload?.sub||!payload.email||!payload.email_verified||(payload as typeof payload&{nonce?:string}).nonce!==attempt.nonce)throw new Error('INVALID_GOOGLE_TOKEN');
    const ticket=random();tickets.set(ticket,{challenge:attempt.challenge,subject:payload.sub,email:payload.email.toLowerCase(),authoritative:payload.email.toLowerCase().endsWith('@gmail.com')||Boolean(payload.hd),expires:Date.now()+60000});
    return `${attempt.redirect}#ticket=${ticket}`;
  }catch{return `${attempt.redirect}#error=google_login_failed`;}
}
export async function exchangeGoogleTicket(ticket:string,verifier:string){
  clean();const pending=tickets.get(ticket);
  if(!pending||createHash('sha256').update(verifier).digest('hex')!==pending.challenge)throw new Error('INVALID_TICKET');
  tickets.delete(ticket);
  return resolveGoogleIdentity(pending.subject,pending.email,pending.authoritative);
}
export async function resolveGoogleIdentity(subject:string,email:string,authoritative:boolean){
  const rows=await executeQuery<{Id:number;CompanyId:number;FirstName:string;LastName:string;Email:string;RoleName:'ADMIN'|'EMPLOYEE';GoogleSubject:string|null}>(`
    SELECT u.Id,u.CompanyId,u.FirstName,u.LastName,u.Email,u.GoogleSubject,r.Name AS RoleName
    FROM dbo.AppUser u JOIN dbo.Role r ON r.Id=u.RoleId JOIN dbo.Company c ON c.Id=u.CompanyId
    WHERE u.Email=? AND u.IsActive=1 AND r.IsActive=1 AND c.IsActive=1 AND r.Name IN(N'ADMIN',N'EMPLOYEE');`,[email]);
  const user=rows[0];
  if(rows.length!==1||!user||(user.GoogleSubject&&user.GoogleSubject!==subject))throw new Error('GOOGLE_ACCESS_DENIED');
  if(!user.GoogleSubject){
    if(!authoritative)throw new Error('GOOGLE_EMAIL_REQUIRES_LINK');
    await executeQuery(`SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
      UPDATE dbo.AppUser SET GoogleSubject=? WHERE Id=? AND CompanyId=? AND Email=? AND IsActive=1 AND GoogleSubject IS NULL;
      IF @@ROWCOUNT<>1 THROW 50040,'GOOGLE_LINK_CONFLICT',1;
      INSERT INTO dbo.AuditLog(CompanyId,UserId,Action,Entity,EntityId,Reason,CreatedAt)
        VALUES(?,?,N'GOOGLE_ACCOUNT_LINKED',N'APPUSER',?,N'Acceso con correo verificado por Google.',SYSUTCDATETIME());
      COMMIT TRANSACTION;
      END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,[subject,user.Id,user.CompanyId,email,user.CompanyId,user.Id,user.Id]);
  }
  return passwordSession(await recordSuccessfulLogin(user.CompanyId,user.Id,'GOOGLE'));
}
