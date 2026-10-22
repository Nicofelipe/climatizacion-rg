require('dotenv').config({quiet:true});require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),driver=require('msnodesqlv8');
process.env.STORAGE_ENCRYPTION_KEY='a'.repeat(64);
const cs='Driver={ODBC Driver 18 for SQL Server};Server='+process.env.DB_SERVER+';Database='+process.env.DB_DATABASE+';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
let role='ADMIN',company=3,version=0,saved;
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:(sql,params)=>new Promise((resolve,reject)=>{
 const fixture=`SET NOCOUNT ON;
 CREATE TABLE #Role(Id int,Name nvarchar(20),IsActive bit);CREATE TABLE #Company(Id int,IsActive bit);
 CREATE TABLE #AppUser(Id int,CompanyId int,RoleId int,IsActive bit,PasswordVersion int);
 CREATE TABLE #CompanyStorage(Id int,CompanyId int,IsActive bit);
 CREATE TABLE #CompanyStorageCredential(CompanyStorageId int,EncryptedRefreshToken nvarchar(max),UpdatedAt datetime2);
 CREATE TABLE #AuditLog(CompanyId int,UserId int,Action nvarchar(100),Entity nvarchar(100),EntityId int,Reason nvarchar(1000),CreatedAt datetime2);
 INSERT INTO #Role VALUES(1,N'${role}',1);INSERT INTO #Company VALUES(3,1);
 INSERT INTO #AppUser VALUES(5,3,1,1,${version});INSERT INTO #CompanyStorage VALUES(7,${company},1);
 `;
 let isolated=sql;for(const table of ['AppUser','Role','CompanyStorageCredential','CompanyStorage','Company','AuditLog'])isolated=isolated.replaceAll('dbo.'+table,'#'+table);
 driver.query(cs,fixture+isolated+' SELECT EncryptedRefreshToken,(SELECT COUNT(*) FROM #AuditLog) AS AuditCount FROM #CompanyStorageCredential;',params,(error,rows)=>{if(error)return reject(error);saved=rows;resolve(rows);});
})}};
const {upsertStorageCredential}=require('../src/services/storageCredential.service.ts');const {decryptSecret}=require('../src/utils/encryption.ts');
test('Drive credential replacement rechecks admin, company and session version in the audited transaction',async()=>{
 const actor={companyId:3,userId:5,passwordVersion:0};await upsertStorageCredential(7,'isolated-test-token',actor);
 assert.equal(saved[0].AuditCount,1);assert.equal(decryptSecret(saved[0].EncryptedRefreshToken),'isolated-test-token');
 role='EMPLOYEE';await assert.rejects(upsertStorageCredential(7,'never-saved',actor),/DRIVE_ADMIN_UNAVAILABLE/);role='ADMIN';
 company=4;await assert.rejects(upsertStorageCredential(7,'never-saved',actor),/DRIVE_STORAGE_UNAVAILABLE/);company=3;
 version=1;await assert.rejects(upsertStorageCredential(7,'never-saved',actor),/DRIVE_ADMIN_UNAVAILABLE/);
});
