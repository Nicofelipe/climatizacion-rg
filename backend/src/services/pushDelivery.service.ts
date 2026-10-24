import {existsSync} from 'node:fs';
import {google} from 'googleapis';
import {executeQuery} from '../database/sqlServer';
import {decryptSecret} from '../utils/encryption';
import {notificationMessage} from './notificationMessage';
export function pushConfigured(){return Boolean(process.env.FCM_PROJECT_ID&&/^[a-z][a-z0-9-]{4,62}$/.test(process.env.FCM_PROJECT_ID)
 &&process.env.FCM_SERVICE_ACCOUNT_FILE&&existsSync(process.env.FCM_SERVICE_ACCOUNT_FILE));}
interface Delivery{Id:number;DeviceId:number;NotificationId:number;Kind:string;EncryptedToken:string;Attempts:number;RegistrationId:string}
let auth:InstanceType<typeof google.auth.GoogleAuth>|null=null;
export async function sendFcm(token:string,notificationId:number,kind:string){
 if(!pushConfigured())throw new Error('PUSH_NOT_CONFIGURED');
 auth??=new google.auth.GoogleAuth({keyFilename:process.env.FCM_SERVICE_ACCOUNT_FILE,scopes:['https://www.googleapis.com/auth/firebase.messaging']});
 const accessToken=await auth.getAccessToken();if(!accessToken)throw new Error('PUSH_AUTH_FAILED');
 const message=notificationMessage(kind);
 const response=await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`,{
  method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},
  body:JSON.stringify({message:{token,notification:message,data:{notificationId:String(notificationId)},
   android:{priority:'high',ttl:'86400s',notification:{channel_id:'rendiciones',visibility:'PRIVATE',tag:`notification-${notificationId}`}}}})});
 if(!response.ok){const value=await response.json().catch(()=>null) as {error?:{details?:{errorCode?:string}[]}}|null;
  if(value?.error?.details?.some(detail=>detail.errorCode==='UNREGISTERED'))throw new Error('PUSH_DEVICE_UNREGISTERED');
  throw new Error('PUSH_SEND_FAILED');
 }
}
export async function processPushQueue(send=sendFcm){
 await executeQuery(`SET XACT_ABORT ON; BEGIN TRY BEGIN TRANSACTION;
  INSERT INTO dbo.PushDelivery(NotificationId,DeviceId)
   SELECT n.Id,d.Id FROM dbo.UserNotification n JOIN dbo.PushDevice d ON d.UserId=n.UserId AND d.CompanyId=n.CompanyId
   JOIN dbo.AppUser u ON u.Id=d.UserId AND u.CompanyId=d.CompanyId
   JOIN dbo.Role r ON r.Id=u.RoleId JOIN dbo.Company c ON c.Id=u.CompanyId
   WHERE n.ReadAt IS NULL AND n.CreatedAt>DATEADD(day,-1,SYSUTCDATETIME()) AND d.IsActive=1 AND d.LastSeenAt>DATEADD(day,-30,SYSUTCDATETIME())
    AND u.IsActive=1 AND r.IsActive=1 AND c.IsActive=1 AND d.SessionVersion=u.PasswordVersion
    AND (n.Kind<>N'PENDING_REVIEW' OR r.Name=N'ADMIN')
    AND NOT EXISTS(SELECT 1 FROM dbo.PushDelivery WITH(UPDLOCK,HOLDLOCK) WHERE NotificationId=n.Id AND DeviceId=d.Id);
  UPDATE dbo.PushDelivery SET Status=N'PENDING' WHERE Status=N'SENDING' AND LockedUntil<SYSUTCDATETIME();
  COMMIT TRANSACTION; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK TRANSACTION; THROW; END CATCH;`,[]);
 const rows=await executeQuery<Delivery>(`SET NOCOUNT ON;
  DECLARE @Claimed TABLE(Id int);
  ;WITH Jobs AS(SELECT TOP 10 q.* FROM dbo.PushDelivery q WITH(UPDLOCK,READPAST)
   JOIN dbo.UserNotification n ON n.Id=q.NotificationId JOIN dbo.PushDevice d ON d.Id=q.DeviceId AND d.UserId=n.UserId AND d.CompanyId=n.CompanyId
   JOIN dbo.AppUser u ON u.Id=d.UserId AND u.CompanyId=d.CompanyId JOIN dbo.Role r ON r.Id=u.RoleId JOIN dbo.Company c ON c.Id=u.CompanyId
   WHERE q.Status=N'PENDING' AND q.NextAttemptAt<=SYSUTCDATETIME() AND q.Attempts<10 AND n.ReadAt IS NULL
    AND n.CreatedAt>DATEADD(day,-1,SYSUTCDATETIME()) AND d.IsActive=1 AND d.SessionVersion=u.PasswordVersion
    AND d.LastSeenAt>DATEADD(day,-30,SYSUTCDATETIME()) AND u.IsActive=1 AND r.IsActive=1 AND c.IsActive=1
    AND (n.Kind<>N'PENDING_REVIEW' OR r.Name=N'ADMIN') ORDER BY q.Id)
  UPDATE Jobs SET Status=N'SENDING',Attempts=Attempts+1,LockedUntil=DATEADD(minute,5,SYSUTCDATETIME()) OUTPUT INSERTED.Id INTO @Claimed;
  SELECT q.Id,q.DeviceId,q.NotificationId,q.Attempts,n.Kind,d.EncryptedToken,d.RegistrationId
   FROM @Claimed x JOIN dbo.PushDelivery q ON q.Id=x.Id JOIN dbo.UserNotification n ON n.Id=q.NotificationId
   JOIN dbo.PushDevice d ON d.Id=q.DeviceId AND d.CompanyId=n.CompanyId AND d.UserId=n.UserId;`,[]);
 for(const row of rows){
  try{
   const authorized=await executeQuery<{Id:number}>(`SELECT d.Id FROM dbo.PushDevice d
    JOIN dbo.UserNotification n ON n.Id=? AND n.UserId=d.UserId AND n.CompanyId=d.CompanyId
    JOIN dbo.Expense e ON e.Id=n.ExpenseId AND e.CompanyId=n.CompanyId
    JOIN dbo.AppUser u ON u.Id=d.UserId AND u.CompanyId=d.CompanyId
    JOIN dbo.Company c ON c.Id=u.CompanyId JOIN dbo.Role r ON r.Id=u.RoleId
    WHERE d.Id=? AND d.RegistrationId=? AND d.IsActive=1 AND u.IsActive=1 AND c.IsActive=1 AND r.IsActive=1
     AND d.SessionVersion=u.PasswordVersion AND n.ReadAt IS NULL AND e.IsDeleted=0
     AND (n.Kind<>N'PENDING_REVIEW' OR (r.Name=N'ADMIN' AND e.Status=N'PENDING'));`,[row.NotificationId,row.DeviceId,row.RegistrationId]);
   if(!authorized.length){await executeQuery("UPDATE dbo.PushDelivery SET Status=N'CANCELLED',LockedUntil=NULL WHERE Id=?;",[row.Id]);continue;}
   await send(decryptSecret(row.EncryptedToken),row.NotificationId,row.Kind);
   await executeQuery("UPDATE dbo.PushDelivery SET Status=N'SENT',SentAt=SYSUTCDATETIME(),LockedUntil=NULL WHERE Id=? AND Status=N'SENDING';",[row.Id]);
  }catch(error){
   if(error instanceof Error&&error.message==='PUSH_DEVICE_UNREGISTERED'){
    await executeQuery("UPDATE dbo.PushDevice SET IsActive=0 WHERE Id=? AND RegistrationId=?;UPDATE dbo.PushDelivery SET Status=N'FAILED',LockedUntil=NULL WHERE Id=?;",[row.DeviceId,row.RegistrationId,row.Id]);
   }else{await executeQuery("UPDATE dbo.PushDelivery SET Status=CASE WHEN Attempts>=10 THEN N'FAILED' ELSE N'PENDING' END,NextAttemptAt=DATEADD(second,?,SYSUTCDATETIME()),LockedUntil=NULL WHERE Id=?;",[Math.min(3600,30*2**row.Attempts),row.Id]);}
  }
 }
}
export function startPushWorker(){
 let busy=false;
 const tick=async()=>{if(busy||!pushConfigured())return;busy=true;try{await processPushQueue();}catch{console.warn('No fue posible procesar la cola de avisos. Se reintentará.');}finally{busy=false;}};
 const timer=setInterval(tick,15000);timer.unref();void tick();return ()=>clearInterval(timer);
}
