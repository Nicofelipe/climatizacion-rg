require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
let user,saved;
for(const [name,exports] of [
 ['../src/middlewares/auth.middleware.ts',{authenticateToken:(req,res,next)=>{if(!user){res.sendStatus(401);return;}req.user=user;next();}}],
 ['../src/services/expense.service.ts',{getExpenses:async(...args)=>{saved=args;return [];}}],
 ['../src/database/sqlServer.ts',{executeQuery:async(_sql,params)=>{assert.deepEqual(params,[3]);return [{Name:'Empresa de prueba'}];}}],
]){const file=require.resolve(name);require.cache[file]={id:file,filename:file,loaded:true,exports};}
const router=require('../src/routes/report.routes.ts').default;
test('only administrators export; scope and company come from the authenticated identity',async()=>{
 const app=express();app.use('/reports',router);const server=await new Promise(resolve=>{const value=app.listen(0,'127.0.0.1',()=>resolve(value));});
 const url=`http://127.0.0.1:${server.address().port}/reports/expenses?year=2026`;
 try{
  assert.equal((await fetch(url)).status,401);
  user={userId:5,companyId:3,role:'EMPLOYEE'};assert.equal((await fetch(url)).status,403);
  user={...user,role:'ADMIN'};
  const result=await fetch(url+'&companyId=99&userId=99');assert.equal(result.status,200);assert.deepEqual(saved,[3,5,'ADMIN']);
  const report=await result.json();assert.match(report.filename,/2026_EMPRESA.xlsx$/);assert.ok(Buffer.from(report.base64,'base64').subarray(0,2).equals(Buffer.from('PK')));
  await fetch(url+'&scope=personal');assert.deepEqual(saved,[3,5,'EMPLOYEE']);
  assert.equal((await fetch(url+'&scope=other')).status,400);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
