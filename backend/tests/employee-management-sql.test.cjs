require('dotenv').config({quiet:true});require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),driver=require('msnodesqlv8');
const cs='Driver={ODBC Driver 18 for SQL Server};Server='+process.env.DB_SERVER+';Database='+process.env.DB_DATABASE+';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
const fixture=`SET NOCOUNT ON;
CREATE TABLE #Role(Id int,Name nvarchar(20),IsActive bit);
CREATE TABLE #AppUser(Id int,CompanyId int,RoleId int,IsActive bit,FirstName nvarchar(100),LastName nvarchar(100),Email nvarchar(254),Phone nvarchar(30));
CREATE TABLE #AuditLog(Id int IDENTITY,CompanyId int,UserId int,Action nvarchar(100),Entity nvarchar(100),EntityId int,BeforeData nvarchar(max),AfterData nvarchar(max),Reason nvarchar(1000),CreatedAt datetime2);
INSERT INTO #Role VALUES(1,N'ADMIN',1),(2,N'EMPLOYEE',1);
INSERT INTO #AppUser VALUES(5,3,1,1,N'Admin',N'Uno',N'admin@test.cl',NULL),(6,3,2,1,N'Antiguo',N'Apellido',N'empleado@test.cl',NULL),(7,4,2,1,N'Otro',N'Empresa',N'otro@test.cl',NULL);
`;
let saved;
const path=require.resolve('../src/database/sqlServer.ts');require.cache[path]={id:path,filename:path,loaded:true,exports:{executeQuery:(sql,params)=>new Promise((resolve,reject)=>{
 let isolated=sql.replaceAll('dbo.AppUser','#AppUser').replaceAll('dbo.Role','#Role').replaceAll('dbo.AuditLog','#AuditLog');
 isolated=isolated.replace('SELECT 1 AS Updated;',`SELECT a.UserId,a.BeforeData,a.AfterData,a.Reason FROM #AuditLog a;`);
 driver.query(cs,fixture+isolated,params,(err,rows)=>{if(err)return reject(err);saved=rows;resolve(rows);});
})}};
const {updateEmployeeController}=require('../src/controllers/employeeManagement.controller.ts');
const body={firstName:'Nuevo',lastName:'Apellido',email:'nuevo@test.cl',phone:'123',reason:'Actualización solicitada'};
async function run(user={userId:5,companyId:3,role:'ADMIN'},id=6,change={}){const res={code:200,status(n){this.code=n;return this;},sendStatus(n){this.code=n;return this;},json(data){this.data=data;return this;}};await updateEmployeeController({user,params:{id:String(id)},body:{...body,...change}},res);return res;}
test('worker update audits actor, old and new data',async()=>{const res=await run();assert.equal(res.code,200);assert.equal(saved[0].UserId,5);assert.equal(JSON.parse(saved[0].BeforeData).FirstName,'Antiguo');assert.equal(JSON.parse(saved[0].AfterData).FirstName,'Nuevo');});
test('cannot edit employee in another company',async()=>assert.equal((await run(undefined,7)).code,404));
test('cannot edit administrator through employee endpoint',async()=>assert.equal((await run(undefined,5)).code,404));
test('employee cannot administer users',async()=>assert.equal((await run({userId:6,companyId:3,role:'EMPLOYEE'})).code,403));
test('email collision is rejected',async()=>assert.equal((await run(undefined,6,{email:'otro@test.cl'})).code,409));
test('reason required',async()=>assert.equal((await run(undefined,6,{reason:''})).code,400));
