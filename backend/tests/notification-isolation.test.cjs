// Execute the actual inbox SQL against connection-local temporary tables only.
require('dotenv').config({quiet:true});require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),driver=require('msnodesqlv8');
const cs='Driver={ODBC Driver 18 for SQL Server};Server='+process.env.DB_SERVER+';Database='+process.env.DB_DATABASE+';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
const fixture=`SET NOCOUNT ON;
 CREATE TABLE #Expense(Id int,CompanyId int,IsDeleted bit,Status nvarchar(20));
 CREATE TABLE #UserNotification(Id int,CompanyId int,UserId int,ExpenseId int,Kind nvarchar(30),CreatedAt datetime2 DEFAULT SYSUTCDATETIME(),ReadAt datetime2);
 INSERT INTO #Expense VALUES(11,3,0,N'APPROVED'),(12,3,0,N'PENDING'),(13,3,1,N'APPROVED'),(21,4,0,N'APPROVED');
 INSERT INTO #UserNotification(Id,CompanyId,UserId,ExpenseId,Kind) VALUES
 (1,3,5,11,N'APPROVED'),(2,3,6,11,N'APPROVED'),(3,4,7,21,N'APPROVED'),
 (4,3,5,13,N'APPROVED'),(5,3,5,12,N'PENDING_REVIEW');
 INSERT INTO #UserNotification(Id,CompanyId,UserId,ExpenseId,Kind,ReadAt) VALUES
 (6,3,5,11,N'APPROVED',SYSUTCDATETIME());`;
const db=require.resolve('../src/database/sqlServer.ts');
let lastQuery;
require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:(statement,params)=>new Promise((resolve,reject)=>{
 lastQuery={statement,params};
 driver.query(cs,fixture+statement.replaceAll('dbo.Expense','#Expense').replaceAll('dbo.UserNotification','#UserNotification'),params,
 (error,rows)=>error?reject(error):resolve(rows??[]));
})}};
const {listNotifications,readNotification}=require('../src/services/notification.service.ts');
test('notification inbox shows only unread items and links stay private to company and recipient',async()=>{
 assert.deepEqual((await listNotifications(3,5,false)).map(row=>row.Id),[1]);
 assert.deepEqual((await listNotifications(3,5,true)).map(row=>row.Id),[5,1]);
 assert.equal((await listNotifications(3,5,true))[0].UnreadCount,2);
 assert.deepEqual((await listNotifications(3,6,false)).map(row=>row.Id),[2]);
 assert.deepEqual(await listNotifications(4,5,true),[]);
 assert.deepEqual(await readNotification(3,5,2,true),[]);
 assert.deepEqual(await readNotification(3,5,3,true),[]);
 assert.deepEqual(await readNotification(3,5,5,false),[]);
 const own=await readNotification(3,5,1,false);assert.equal(own[0].ExpenseId,11);assert.ok(own[0].ReadAt);
});
test('opening a notification removes it from the next inbox query and lowers the count',async()=>{
 await readNotification(3,5,1,true);const read=lastQuery;
 await listNotifications(3,5,true);const list=lastQuery;
 const isolated=(sql)=>sql.replaceAll('dbo.Expense','#Expense').replaceAll('dbo.UserNotification','#UserNotification');
 const rows=await new Promise((resolve,reject)=>{const result=[];
  driver.query(cs,fixture+isolated(read.statement)+';'+isolated(list.statement),[...read.params,...list.params],(error,rows,more)=>{
   if(error)return reject(error);result.push(...(rows??[]));if(!more)resolve(result);
  });
 });
 const inbox=rows.filter(row=>Object.hasOwn(row,'UnreadCount'));
 assert.deepEqual(inbox.map(row=>row.Id),[5]);assert.equal(inbox[0].UnreadCount,1);
});
