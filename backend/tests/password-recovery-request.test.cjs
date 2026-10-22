require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
let configured=false,users=[],writes=[],sent=[];
process.env.PASSWORD_RESET_URL='http://localhost:8081/reset-password';
const mail=require.resolve('../src/services/recoveryMail.service.ts');require.cache[mail]={id:mail,filename:mail,loaded:true,exports:{recoveryMailConfigured:()=>configured,sendRecoveryMail:async(to,text)=>sent.push({to,text})}};
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:async(sql,params)=>{if(sql.includes('SELECT u.Id'))return users;writes.push({sql,params});return [];}}};
const {requestPasswordRecovery,resetTokenHash}=require('../src/services/passwordRecovery.service.ts');
test('recovery sends only to a registered mailbox and stores only a hash of the secret',async()=>{
 await assert.rejects(requestPasswordRecovery('persona@test.cl'),/RECOVERY_MAIL_NOT_CONFIGURED/);assert.equal(writes.length,0);
 configured=true;await requestPasswordRecovery('unknown@test.cl');assert.equal(sent.length,0);assert.equal(writes.length,0);
 users=[{Id:5,CompanyId:3,Email:'persona@test.cl',PasswordVersion:2}];await requestPasswordRecovery('persona@test.cl');assert.equal(sent.length,1);assert.equal(sent[0].to,'persona@test.cl');
 const link=sent[0].text.match(/http:\/\/localhost:8081\/reset-password#token=([a-f0-9]{64})/);assert.ok(link);assert.equal(writes[0].params[2],resetTokenHash(link[1]));assert.equal(writes[0].params.includes(link[1]),false);assert.equal(writes[0].params[3],2);assert.match(writes[0].sql,/DATEADD\(minute,20/);
});
