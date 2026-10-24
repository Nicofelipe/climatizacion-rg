require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),bcrypt=require('bcryptjs');
let account;
const driver=require.resolve('msnodesqlv8');require.cache[driver]={id:driver,filename:driver,loaded:true,exports:{query:(connection,sql,params,callback)=>callback(null,account?[account]:[])}};
const policy=require.resolve('../src/services/passwordPolicy.service.ts');require.cache[policy]={id:policy,filename:policy,loaded:true,exports:{recordSuccessfulLogin:async()=>account,passwordSession:()=>({token:'test-session'})}};
const {loginService}=require('../src/services/auth.service.ts');
test('inactive accounts cannot log in; disablement is disclosed only after a valid password',async()=>{
 account={Id:6,CompanyId:3,RoleName:'EMPLOYEE',PasswordHash:await bcrypt.hash('ValidPassword123',4),IsActive:false};
 await assert.rejects(loginService('test@example.test','WrongPassword123'),/INVALID_CREDENTIALS/);
 await assert.rejects(loginService('test@example.test','ValidPassword123'),/ACCOUNT_INACTIVE/);
 account.IsActive=true;assert.equal((await loginService('test@example.test','ValidPassword123')).token,'test-session');
 account=null;await assert.rejects(loginService('unknown@example.test','ValidPassword123'),/INVALID_CREDENTIALS/);
});
