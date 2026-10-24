require('dotenv').config({quiet:true});require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),driver=require('msnodesqlv8');
const cs='Driver={ODBC Driver 18 for SQL Server};Server='+process.env.DB_SERVER+';Database='+process.env.DB_DATABASE+';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
const fixture=`SET NOCOUNT ON;
CREATE TABLE #Role(Id int,Name nvarchar(20),IsActive bit);
CREATE TABLE #AppUser(Id int IDENTITY(10,1),CompanyId int,RoleId int,FirstName nvarchar(100),LastName nvarchar(100),Email nvarchar(254),PasswordHash nvarchar(255),Phone nvarchar(30),Rut nvarchar(12),IsActive bit,MustChangePassword bit,CreatedAt datetime2 DEFAULT SYSUTCDATETIME());
CREATE TABLE #AuditLog(CompanyId int,UserId int,Action nvarchar(100),Entity nvarchar(100),EntityId int,Reason nvarchar(1000),CreatedAt datetime2);
INSERT INTO #Role VALUES(1,N'ADMIN',1),(2,N'EMPLOYEE',1);
INSERT INTO #AppUser(CompanyId,RoleId,IsActive,Email) VALUES(3,1,1,N'admin@test.cl'),(3,2,1,N'taken@test.cl'),(4,1,1,N'other@test.cl');
`;
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:async(sql,params)=>{
 if(!sql.includes('INSERT INTO dbo.AppUser'))return [];
 const isolated=sql.replaceAll('dbo.AppUser','#AppUser').replaceAll('dbo.Role','#Role').replaceAll('dbo.AuditLog','#AuditLog').replace('SELECT u.Id,u.CompanyId,u.RoleId,','SELECT u.MustChangePassword,(SELECT COUNT(*) FROM #AuditLog) AS AuditCount,u.Id,u.CompanyId,u.RoleId,');
 return new Promise((resolve,reject)=>driver.query(cs,fixture+isolated,params,(err,rows)=>err?reject(err):resolve(rows)));
}}};
const {createEmployee}=require('../src/services/user.service.ts');const input={companyId:3,actorId:10,role:'ADMIN',firstName:'Nuevo',lastName:'Supervisor',email:'nuevo@test.cl',password:'Clave123'};
test('only active company administrators can create supervisors or workers and the role is audited',async()=>{
 const admin=await createEmployee(input);assert.equal(admin.RoleId,1);assert.equal(admin.CompanyId,3);assert.equal(admin.MustChangePassword,true);assert.equal(admin.AuditCount,1);assert.equal('PasswordHash'in admin,false);
 const employee=await createEmployee({...input,role:'EMPLOYEE'});assert.equal(employee.RoleId,2);
 await assert.rejects(createEmployee({...input,actorId:11}),/CREATE_USER_FORBIDDEN/);
 await assert.rejects(createEmployee({...input,actorId:12}),/CREATE_USER_FORBIDDEN/);
 await assert.rejects(createEmployee({...input,companyId:4}),/CREATE_USER_FORBIDDEN/);
 await assert.rejects(createEmployee({...input,email:'taken@test.cl'}),/EMAIL_ALREADY_EXISTS/);
});
