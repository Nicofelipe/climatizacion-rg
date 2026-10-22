require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
let users=[],writes=0;
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:async(sql,params)=>{if(sql.includes('SELECT u.Id'))return users;if(sql.includes('SET GoogleSubject')){writes++;assert.equal(params[0],'google-subject');}return [];}}};
const token=require.resolve('../src/services/token.service.ts');require.cache[token]={id:token,filename:token,loaded:true,exports:{generateAccessToken:identity=>JSON.stringify(identity)}};
const {resolveGoogleIdentity,startGoogleLogin,exchangeGoogleTicket,completeGoogleLogin}=require('../src/services/googleLogin.service.ts');
const user={Id:5,CompanyId:3,FirstName:'Nombre',LastName:'Apellido',Email:'persona@gmail.com',RoleName:'EMPLOYEE',GoogleSubject:null};
test('Google identity only maps an existing active registered account and keeps its role',async()=>{
 users=[];await assert.rejects(resolveGoogleIdentity('google-subject','persona@gmail.com',true),/GOOGLE_ACCESS_DENIED/);
 users=[{...user}];const employee=await resolveGoogleIdentity('google-subject',user.Email,true);assert.equal(employee.user.role,'EMPLOYEE');assert.equal(employee.user.companyId,3);assert.equal(writes,1);
 users=[{...user,RoleName:'ADMIN',GoogleSubject:'google-subject'}];const admin=await resolveGoogleIdentity('google-subject',user.Email,true);assert.equal(admin.user.role,'ADMIN');assert.equal(writes,1);
 users=[{...user,GoogleSubject:'different-subject'}];await assert.rejects(resolveGoogleIdentity('google-subject',user.Email,true),/GOOGLE_ACCESS_DENIED/);
 users=[{...user},{...user,CompanyId:4}];await assert.rejects(resolveGoogleIdentity('google-subject',user.Email,true),/GOOGLE_ACCESS_DENIED/);
 users=[{...user}];await assert.rejects(resolveGoogleIdentity('google-subject','persona@hotmail.com',false),/GOOGLE_EMAIL_REQUIRES_LINK/);assert.equal(writes,1);
});
test('OAuth rejects arbitrary redirects, malformed challenge, unknown state and ticket',async()=>{
 assert.throws(()=>startGoogleLogin('https://attacker.example','a'.repeat(64)),/INVALID_REDIRECT/);
 assert.throws(()=>startGoogleLogin('http://localhost:8081/google-login','bad'),/INVALID_REDIRECT/);
 await assert.rejects(completeGoogleLogin('unknown','code'),/INVALID_STATE/);
 await assert.rejects(exchangeGoogleTicket('unknown','verifier'),/INVALID_TICKET/);
});
