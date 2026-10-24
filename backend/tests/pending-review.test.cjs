// Real SQL query against connection-local temporary tables only.
require('dotenv').config({quiet:true});require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),driver=require('msnodesqlv8');
const cs='Driver={ODBC Driver 18 for SQL Server};Server='+process.env.DB_SERVER+';Database='+process.env.DB_DATABASE+';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
let multiple=false,active=1;
const fixture=()=>`SET NOCOUNT ON;
CREATE TABLE #Role(Id int,Name nvarchar(20),IsActive bit);
CREATE TABLE #AppUser(Id int,CompanyId int,RoleId int,IsActive bit);
CREATE TABLE #Expense(Id int,CompanyId int,UserId int,Status nvarchar(20),IsDeleted bit);
INSERT INTO #Role VALUES(1,N'ADMIN',1),(2,N'EMPLOYEE',1);
INSERT INTO #AppUser VALUES(5,3,1,${active}),(6,3,2,1),(7,4,1,1);
${multiple?'INSERT INTO #AppUser VALUES(8,3,1,1);':''}
INSERT INTO #Expense VALUES(11,3,5,N'PENDING',0),(12,3,6,N'PENDING',0),(13,3,6,N'APPROVED',0),(14,3,6,N'PENDING',1),(21,4,7,N'PENDING',0);
`;
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:(sql,params)=>new Promise((resolve,reject)=>{
 const isolated=sql.replaceAll('dbo.AppUser','#AppUser').replaceAll('dbo.Role','#Role').replaceAll('dbo.Expense','#Expense');
 driver.query(cs,fixture()+isolated,params,(err,rows)=>err?reject(err):resolve(rows));
})}};
const {getPendingReviews}=require('../src/services/pendingReview.service.ts');
test('pending inbox respects active role, company, ownership and review policy',async()=>{
 assert.deepEqual((await getPendingReviews(3,5)).map(row=>row.Id),[12,11]);
 multiple=true;assert.deepEqual((await getPendingReviews(3,5)).map(row=>row.Id),[12]);
 assert.deepEqual((await getPendingReviews(3,8)).map(row=>row.Id),[12,11]);
 assert.deepEqual(await getPendingReviews(3,6),[]);
 assert.deepEqual(await getPendingReviews(4,5),[]);
 active=0;assert.deepEqual(await getPendingReviews(3,5),[]);
});
