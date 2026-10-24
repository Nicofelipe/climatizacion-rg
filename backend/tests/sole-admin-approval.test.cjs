require('dotenv').config({quiet:true});require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),driver=require('msnodesqlv8');
const cs='Driver={ODBC Driver 18 for SQL Server};Server='+process.env.DB_SERVER+';Database='+process.env.DB_DATABASE+';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
let secondAdmin=false,hasImage=true,owner=5,secondActive=1,saved;
const fixture=()=>require('./fixtures/notificationTable.cjs')+`SET NOCOUNT ON;
CREATE TABLE #Role(Id int,Name nvarchar(20),IsActive bit);
CREATE TABLE #AppUser(Id int,CompanyId int,RoleId int,IsActive bit);
CREATE TABLE #Expense(Id int,CompanyId int,UserId int,Status nvarchar(20),IsDeleted bit,ReviewedByUserId int,ReviewedAt datetime2,UpdatedAt datetime2,DriveSyncPending bit);
CREATE TABLE #File(CompanyId int,EntityId int,EntityType nvarchar(30));
CREATE TABLE #AuditLog(CompanyId int,UserId int,Action nvarchar(100),Entity nvarchar(100),EntityId int,Reason nvarchar(1000),CreatedAt datetime2);
INSERT INTO #Role VALUES(1,N'ADMIN',1),(2,N'EMPLOYEE',1);
INSERT INTO #AppUser VALUES(5,3,1,1),(6,3,2,1),(7,4,1,1);
INSERT INTO #Expense VALUES(11,3,${owner},N'PENDING',0,NULL,NULL,NULL,0);
${secondAdmin?`INSERT INTO #AppUser VALUES(8,3,1,${secondActive});`:''}
${hasImage?`INSERT INTO #File VALUES(3,11,N'EXPENSE');`:''}
`;
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:(sql,params)=>new Promise((resolve,reject)=>{
  let statement=sql.replaceAll('dbo.UserNotification','#UserNotification').replaceAll('dbo.AppUser','#AppUser').replaceAll('dbo.Role','#Role').replaceAll('dbo.Expense','#Expense').replaceAll('dbo.[File]','#File').replaceAll('dbo.AuditLog','#AuditLog');
  statement=statement.replace('SELECT Id FROM @Changed;',`SELECT c.Id,a.Action,a.Reason,e.Status,e.ReviewedByUserId FROM @Changed c JOIN #Expense e ON e.Id=c.Id JOIN #AuditLog a ON a.EntityId=c.Id;`);
  driver.query(cs,fixture()+statement,params,(err,rows)=>{if(err)return reject(err);saved=rows;resolve(rows);});
})}};
const {autoApproveSoleAdmin}=require('../src/services/approvalPolicy.service.ts');
test('automatic approval applies only to sole active administrator with a saved image',async()=>{
 assert.equal(await autoApproveSoleAdmin(3,5,11),true);
 assert.equal(saved[0].Action,'AUTO_APPROVE_SOLE_ADMIN');assert.equal(saved[0].ReviewedByUserId,5);assert.match(saved[0].Reason,/único administrador/);assert.equal(saved[0].Status,'APPROVED');
 secondAdmin=true;assert.equal(await autoApproveSoleAdmin(3,5,11),false);
 secondActive=0;assert.equal(await autoApproveSoleAdmin(3,5,11),true);
 secondAdmin=false;hasImage=false;assert.equal(await autoApproveSoleAdmin(3,5,11),false);
 hasImage=true;owner=6;assert.equal(await autoApproveSoleAdmin(3,6,11),false);
 owner=5;assert.equal(await autoApproveSoleAdmin(4,7,11),false);
});
