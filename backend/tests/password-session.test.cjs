require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken');
process.env.JWT_SECRET='isolated-password-policy-test';
let account={RoleName:'EMPLOYEE',PasswordVersion:1},expired=false;
const path=require.resolve('../src/services/passwordPolicy.service.ts');require.cache[path]={id:path,filename:path,loaded:true,exports:{getPasswordAccount:async()=>account,passwordPolicy:()=>({expired})}};
const {authenticateToken}=require('../src/middlewares/auth.middleware.ts');
async function request(path,version=1){let next=false;const token=jwt.sign({userId:5,companyId:3,role:'EMPLOYEE',passwordVersion:version},process.env.JWT_SECRET);
 const res={status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
 await authenticateToken({headers:{authorization:`Bearer ${token}`},path},res,()=>{next=true;});return {next,res};}
test('expired initial passwords block data routes but allow password recovery flow',async()=>{
 expired=true;assert.equal((await request('/')).res.code,403);assert.equal((await request('/password/status')).next,true);assert.equal((await request('/password/change')).next,true);
 expired=false;assert.equal((await request('/')).next,true);
 assert.equal((await request('/',0)).res.code,401);
 account=null;assert.equal((await request('/')).res.code,401);
});
