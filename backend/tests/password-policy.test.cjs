require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),bcrypt=require('bcryptjs');
let writes=0,account;
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:async(sql,params)=>{
 if(sql.includes('SELECT u.Id'))return account?[account]:[];
 writes++;assert.match(sql,/BEGIN TRANSACTION/);assert.match(sql,/CHANGE_PASSWORD/);assert.match(sql,/PasswordVersion=PasswordVersion\+1/);
 assert.equal(await bcrypt.compare('NewPassword123',params[0]),true);assert.equal(sql.includes(params[0]),false);return [];
}}};
const token=require.resolve('../src/services/token.service.ts');require.cache[token]={id:token,filename:token,loaded:true,exports:{generateAccessToken:identity=>JSON.stringify(identity)}};
const {passwordPolicy,changePassword}=require('../src/services/passwordPolicy.service.ts');
test('48-hour deadline countdown and exact expiry use server time',()=>{
 const value={MustChangePassword:true,Deadline:'2026-10-24T12:00:00Z'};
 assert.equal(passwordPolicy(value,Date.parse('2026-10-22T12:00:00Z')).remainingSeconds,172800);
 assert.equal(passwordPolicy(value,Date.parse('2026-10-23T12:00:00Z')).remainingSeconds,86400);
 assert.equal(passwordPolicy(value,Date.parse(value.Deadline)).expired,true);
 assert.equal(passwordPolicy({...value,MustChangePassword:false},Date.parse('2026-10-25T12:00:00Z')).expired,false);
});
test('password change checks current password, hashes replacement, audits and rotates session',async()=>{
 account={Id:5,CompanyId:3,FirstName:'Persona',LastName:'Prueba',Email:'persona@test.cl',RoleName:'EMPLOYEE',PasswordVersion:0,MustChangePassword:true,Deadline:'2026-10-20T12:00:00Z',PasswordHash:await bcrypt.hash('InitialPassword123',4)};
 await assert.rejects(changePassword(3,5,'incorrect','NewPassword123'),/CURRENT_PASSWORD_INVALID/);assert.equal(writes,0);
 await assert.rejects(changePassword(3,5,'InitialPassword123','short'),/PASSWORD_FORMAT/);assert.equal(writes,0);
 await assert.rejects(changePassword(3,5,'InitialPassword123','InitialPassword123'),/PASSWORD_UNCHANGED/);
 const result=await changePassword(3,5,'InitialPassword123','NewPassword123');assert.equal(writes,1);assert.equal(result.user.passwordPolicy.mustChangePassword,false);assert.equal(JSON.parse(result.token).passwordVersion,1);assert.equal('PasswordHash' in result.user,false);
});
