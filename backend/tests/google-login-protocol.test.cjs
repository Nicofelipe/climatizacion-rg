require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
process.env.GOOGLE_CLIENT_ID='test-client';process.env.GOOGLE_LOGIN_REDIRECT_URI='http://localhost:3000/api/auth/google/callback';
let nonce='',invalidNonce=false,verified=true;
const googlePath=require.resolve('googleapis');require.cache[googlePath]={id:googlePath,filename:googlePath,loaded:true,exports:{google:{auth:{OAuth2:class{
 generateAuthUrl(options){nonce=options.nonce;return `https://accounts.google.com/auth?state=${options.state}`;}
 async getToken(){return {tokens:{id_token:'verified-by-library'}};}
 async verifyIdToken(options){assert.equal(options.audience,'test-client');return {getPayload:()=>({sub:'google-subject',email:'person@gmail.com',email_verified:verified,nonce:invalidNonce?'wrong':nonce,role:'ADMIN'})};}
}}}}};
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:async()=>[{Id:5,CompanyId:3,FirstName:'Persona',LastName:'Prueba',Email:'person@gmail.com',RoleName:'EMPLOYEE',GoogleSubject:'google-subject'}]}};
const tokenPath=require.resolve('../src/services/token.service.ts');require.cache[tokenPath]={id:tokenPath,filename:tokenPath,loaded:true,exports:{generateAccessToken:()=> 'session-token'}};
const {startGoogleLogin,completeGoogleLogin,exchangeGoogleTicket}=require('../src/services/googleLogin.service.ts');
const verifier='a'.repeat(64),challenge=createHash('sha256').update(verifier).digest('hex');
test('OAuth callback binds nonce and a single-use ticket to the initiating app',async()=>{
 const started=new URL(startGoogleLogin('http://localhost:8081/google-login',challenge));
 const state=started.searchParams.get('state');const returned=await completeGoogleLogin(state,'code');
 assert.equal(returned.includes('session-token'),false);
 const ticket=new URLSearchParams(returned.split('#')[1]).get('ticket');assert.ok(ticket);
 await assert.rejects(exchangeGoogleTicket(ticket,'b'.repeat(64)),/INVALID_TICKET/);
 const session=await exchangeGoogleTicket(ticket,verifier);assert.equal(session.user.role,'EMPLOYEE');
 await assert.rejects(exchangeGoogleTicket(ticket,verifier),/INVALID_TICKET/);
 await assert.rejects(completeGoogleLogin(state,'code'),/INVALID_STATE/);
});
test('unverified email, wrong nonce and cancellation never produce a login ticket',async()=>{
 for(const variant of ['unverified','nonce','cancel']){
   verified=variant!=='unverified';invalidNonce=variant==='nonce';
   const started=new URL(startGoogleLogin('http://localhost:8081/google-login',challenge));
   const returned=await completeGoogleLogin(started.searchParams.get('state'),variant==='cancel'?undefined:'code');
   assert.equal(returned,'http://localhost:8081/google-login#error=google_login_failed');
 }
});
