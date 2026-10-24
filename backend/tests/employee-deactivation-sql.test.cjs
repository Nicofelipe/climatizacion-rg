require('dotenv').config({quiet:true});require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),driver=require('msnodesqlv8');
const cs='Driver={ODBC Driver 18 for SQL Server};Server='+process.env.DB_SERVER+';Database='+process.env.DB_DATABASE+';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
const fixture=`SET NOCOUNT ON;
CREATE TABLE #Role(Id int,Name nvarchar(20),IsActive bit);
CREATE TABLE #AppUser(Id int,CompanyId int,RoleId int,IsActive bit,FirstName nvarchar(100),LastName nvarchar(100),Rut nvarchar(12),PasswordVersion int);
CREATE TABLE #PushDevice(UserId int,CompanyId int,IsActive bit);
CREATE TABLE #Expense(Id int,UserId int,CompanyId int,Status nvarchar(20));
CREATE TABLE #AuditLog(Id int IDENTITY,CompanyId int,UserId int,Action nvarchar(100),Entity nvarchar(100),EntityId int,BeforeData nvarchar(max),AfterData nvarchar(max),Reason nvarchar(1000),CreatedAt datetime2);
INSERT INTO #Role VALUES(1,N'ADMIN',1),(2,N'EMPLOYEE',1);
INSERT INTO #AppUser VALUES(5,3,1,1,N'Admin',N'Uno',NULL,0),(6,3,2,1,N'Ana',N'Prueba',N'12345678-5',2),(7,4,2,1,N'Otro',N'Empresa',N'12345678-5',0),(8,3,2,0,N'Baja',N'Anterior',N'12345678-5',1);
INSERT INTO #PushDevice VALUES(6,3,1);
INSERT INTO #Expense VALUES(20,6,3,N'APPROVED');
`;
let saved;
const path=require.resolve('../src/database/sqlServer.ts');require.cache[path]={id:path,filename:path,loaded:true,exports:{executeQuery:(sql,params)=>new Promise((resolve,reject)=>{
 let isolated=sql.replaceAll('dbo.AppUser','#AppUser').replaceAll('dbo.Role','#Role').replaceAll('dbo.AuditLog','#AuditLog').replaceAll('dbo.PushDevice','#PushDevice');
 isolated=isolated.replace('SELECT 1 AS Deactivated;',`SELECT u.IsActive,u.PasswordVersion,(SELECT IsActive FROM #PushDevice) AS PushActive,(SELECT COUNT(*) FROM #Expense) AS Receipts,a.UserId AS Actor,a.Reason,a.Action FROM #AppUser u CROSS JOIN #AuditLog a WHERE u.Id=6;`);
 driver.query(cs,fixture+isolated,params,(err,rows)=>{if(err)return reject(err);saved=rows;resolve(rows);});
})}};
const {deactivateEmployeeController}=require('../src/controllers/employeeManagement.controller.ts');
async function run(user={userId:5,companyId:3,role:'ADMIN'},id=6,body={rut:'12.345.678-5',reason:'Fin de contrato'}){const res={code:200,status(n){this.code=n;return this;},sendStatus(n){this.code=n;return this;},json(data){this.data=data;return this;}};await deactivateEmployeeController({user,params:{id:String(id)},body},res);return res;}
test('deactivation revokes account, session version and push, retains receipts and audits actor',async()=>{
 assert.equal((await run()).code,200);assert.equal(saved[0].IsActive,false);assert.equal(saved[0].PasswordVersion,3);assert.equal(saved[0].PushActive,false);assert.equal(saved[0].Receipts,1);assert.equal(saved[0].Actor,5);assert.equal(saved[0].Action,'DEACTIVATE_EMPLOYEE');assert.equal(saved[0].Reason,'Fin de contrato');
});
test('deactivation is tenant-scoped and cannot deactivate self, admins or an already inactive account',async()=>{
 assert.equal((await run(undefined,7)).code,404);assert.equal((await run(undefined,5)).code,403);assert.equal((await run(undefined,8)).code,404);
 assert.equal((await run({userId:6,companyId:3,role:'EMPLOYEE'})).code,403);
 assert.equal((await run({userId:8,companyId:3,role:'ADMIN'})).code,403);
});
test('deactivation requires matching valid RUT and reason',async()=>{
 assert.equal((await run(undefined,6,{rut:'11111111-1',reason:'Fin'})).code,409);
 assert.equal((await run(undefined,6,{rut:'12345678-9',reason:'Fin'})).code,400);
 assert.equal((await run(undefined,6,{rut:'12345678-5',reason:''})).code,400);
});
