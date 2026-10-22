require('dotenv').config({quiet:true});require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),driver=require('msnodesqlv8'),bcrypt=require('bcryptjs');
const cs='Driver={ODBC Driver 18 for SQL Server};Server='+process.env.DB_SERVER+';Database='+process.env.DB_DATABASE+';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
let expired=false,used=false,version=0,emailChanged=false,result;
const mail=require.resolve('../src/services/recoveryMail.service.ts');require.cache[mail]={id:mail,filename:mail,loaded:true,exports:{sendRecoveryMail:async()=>{},recoveryMailConfigured:()=>true}};
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:(sql,params)=>new Promise((resolve,reject)=>{
 const fixture=`SET NOCOUNT ON;
 CREATE TABLE #Role(Id int,IsActive bit);CREATE TABLE #Company(Id int,IsActive bit);
 CREATE TABLE #AppUser(Id int,CompanyId int,RoleId int,IsActive bit,Email nvarchar(254),PasswordVersion int,PasswordHash nvarchar(255),MustChangePassword bit,PasswordChangedAt datetime2);
 CREATE TABLE #PasswordResetToken(CompanyId int,UserId int,TokenHash char(64),PasswordVersion int,RequestedEmail nvarchar(254),ExpiresAt datetime2,UsedAt datetime2);
 CREATE TABLE #AuditLog(CompanyId int,UserId int,Action nvarchar(100),Entity nvarchar(100),EntityId int,Reason nvarchar(1000),CreatedAt datetime2);
 INSERT INTO #Role VALUES(1,1);INSERT INTO #Company VALUES(3,1);
 INSERT INTO #AppUser VALUES(5,3,1,1,N'persona@test.cl',${version},N'old-hash',1,NULL);
 INSERT INTO #PasswordResetToken VALUES(3,5,'${params[0]}',0,N'${emailChanged?'anterior@test.cl':'persona@test.cl'}',DATEADD(minute,${expired?-1:20},SYSUTCDATETIME()),${used?'SYSUTCDATETIME()':'NULL'});
 INSERT INTO #PasswordResetToken VALUES(3,5,'other-token',0,N'persona@test.cl',DATEADD(minute,20,SYSUTCDATETIME()),NULL);
 `;
 const isolated=sql.replaceAll('dbo.PasswordResetToken','#PasswordResetToken').replaceAll('dbo.AppUser','#AppUser').replaceAll('dbo.Role','#Role').replaceAll('dbo.Company','#Company').replaceAll('dbo.AuditLog','#AuditLog')
   .replace('SELECT @Email AS Email;',`SELECT @Email AS Email,u.PasswordVersion,u.MustChangePassword,u.PasswordHash,(SELECT COUNT(*) FROM #PasswordResetToken WHERE UsedAt IS NOT NULL) AS UsedCount,(SELECT COUNT(*) FROM #AuditLog) AS AuditCount FROM #AppUser u;`);
 driver.query(cs,fixture+isolated,params,(err,rows)=>{if(err)return reject(err);result=rows;resolve(rows);});
})}};
const {resetPassword}=require('../src/services/passwordRecovery.service.ts');
test('password recovery atomically consumes links, rotates sessions and audits without changing real accounts',async()=>{
 await resetPassword('a'.repeat(64),'Clave123');assert.equal(result[0].PasswordVersion,1);assert.equal(result[0].MustChangePassword,false);assert.equal(result[0].UsedCount,2);assert.equal(result[0].AuditCount,1);assert.equal(await bcrypt.compare('Clave123',result[0].PasswordHash),true);
 used=true;await assert.rejects(resetPassword('a'.repeat(64),'Clave123'),/RESET_INVALID/);used=false;
 expired=true;await assert.rejects(resetPassword('a'.repeat(64),'Clave123'),/RESET_INVALID/);expired=false;
 version=1;await assert.rejects(resetPassword('a'.repeat(64),'Clave123'),/RESET_INVALID/);version=0;
 emailChanged=true;await assert.rejects(resetPassword('a'.repeat(64),'Clave123'),/RESET_INVALID/);
 await assert.rejects(resetPassword('bad','Clave123'),/RESET_INVALID/);
 await assert.rejects(resetPassword('a'.repeat(64),'weak'),/PASSWORD_FORMAT/);
});
