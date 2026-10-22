// Only connection-local temporary tables are changed.
require('dotenv').config({quiet:true});require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),driver=require('msnodesqlv8');
const cs='Driver={ODBC Driver 18 for SQL Server};Server='+process.env.DB_SERVER+';Database='+process.env.DB_DATABASE+';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
const fixture=`SET NOCOUNT ON;
CREATE TABLE #Role(Id int,Name nvarchar(20),IsActive bit);
CREATE TABLE #AppUser(Id int,CompanyId int,RoleId int,IsActive bit);
CREATE TABLE #Expense(Id int,CompanyId int,ExpenseDate date,TotalAmount decimal(18,2),NetAmount decimal(18,2),VatAmount decimal(18,2),Status nvarchar(20),IsDeleted bit,DriveSyncPending bit,UpdatedAt datetime2);
CREATE TABLE #AuditLog(Id int IDENTITY,CompanyId int,UserId int,Action nvarchar(100),Entity nvarchar(100),EntityId int,BeforeData nvarchar(max),AfterData nvarchar(max),Reason nvarchar(1000),CreatedAt datetime2);
INSERT INTO #Role VALUES(1,N'ADMIN',1),(2,N'EMPLOYEE',1);
INSERT INTO #AppUser VALUES(5,3,1,1),(6,3,2,1),(7,4,1,1);
INSERT INTO #Expense VALUES(11,3,'2026-10-05',1190,1000,190,N'APPROVED',0,0,NULL);
`;
const path=require.resolve('../src/database/sqlServer.ts');
require.cache[path]={id:path,filename:path,loaded:true,exports:{executeQuery:(statement,params)=>new Promise((resolve,reject)=>{
 let isolated=statement.replaceAll('dbo.Expense','#Expense').replaceAll('dbo.AppUser','#AppUser').replaceAll('dbo.Role','#Role').replaceAll('dbo.AuditLog','#AuditLog');
 isolated=isolated.replace('SELECT ? AS Id;',`SELECT ? AS Id,e.Status,e.DriveSyncPending,a.UserId,a.Reason,a.BeforeData,a.AfterData FROM #Expense e JOIN #AuditLog a ON a.EntityId=e.Id;`);
 driver.query(cs,fixture+isolated,params,(err,rows)=>err?reject(err):resolve(rows));
})}};
const drivePath=require.resolve('../src/services/googleDrive.service.ts');require.cache[drivePath]={id:drivePath,filename:drivePath,loaded:true,exports:{moveExpenseFileInGoogleDrive:async()=>{}}};
const {correctExpense}=require('../src/services/expenseCorrection.service.ts');
const input={companyId:3,userId:5,expenseId:11,expenseDate:'2026-09-30',totalAmount:2380,reason:'Corrección solicitada por el trabajador',expectedDate:'2026-10-05',expectedAmount:1190};
test('admin correction saves snapshots, actor and reason while preserving approval',async()=>{
 const [row]=await correctExpense(input);assert.equal(row.Status,'APPROVED');assert.equal(row.UserId,5);assert.equal(row.DriveSyncPending,true);assert.equal(row.Reason,input.reason);
 assert.equal(JSON.parse(row.BeforeData).TotalAmount,1190);assert.equal(JSON.parse(row.AfterData).TotalAmount,2380);
 assert.equal(JSON.parse(row.AfterData).ExpenseDate,'2026-09-30');
});
for(const [name,change,pattern] of [
 ['employee forbidden',{userId:6},/CORRECTION_FORBIDDEN/],['other company forbidden',{userId:7},/CORRECTION_FORBIDDEN/],
 ['cross-company receipt hidden',{companyId:4,userId:7},/CORRECTION_CONFLICT/],['stale values conflict',{expectedAmount:99},/CORRECTION_CONFLICT/],
 ['unchanged rejected',{expenseDate:'2026-10-05',totalAmount:1190},/CORRECTION_UNCHANGED/]
])test(name,async()=>assert.rejects(correctExpense({...input,...change}),pattern));
