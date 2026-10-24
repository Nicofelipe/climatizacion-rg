require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createSessionPersistence}=require('../../mobile/src/utils/sessionPersistence.ts');
test('mobile session restores without persisting passwords or unknown fields',async()=>{
 let raw=null;const storage=createSessionPersistence({get:async()=>raw,set:async value=>{raw=value;},remove:async()=>{raw=null;}});
 const user={id:1,companyId:3,firstName:'Prueba',lastName:'Persona',email:'test@example.test',role:'EMPLOYEE',password:'never-save-this'};
 await storage.store({token:'example-token',user});assert.equal((await storage.load()).user.id,1);assert.ok(!raw.includes('never-save-this'));
 const save=storage.store({token:'new-token',user}),logout=storage.store(null);await Promise.all([save,logout]);assert.equal(await storage.load(),null);
 raw='{bad';assert.equal(await storage.load(),null);raw=JSON.stringify({token:'a',user:{id:1,companyId:0,role:'ADMIN'}});assert.equal(await storage.load(),null);
});
test('logout still clears storage after an earlier failed write',async()=>{
 let removed=false;const storage=createSessionPersistence({get:async()=>null,set:async()=>{throw Error('unavailable');},remove:async()=>{removed=true;}});
 await assert.rejects(storage.store({token:'a',user:{id:1,companyId:2,role:'ADMIN'}}));await storage.store(null);assert.equal(removed,true);
});
test('push summaries share one Android tag only within the same user and company',()=>{
 const {pushSummary}=require('../src/services/pushSummary.ts');const a=pushSummary(1,3,2),b=pushSummary(1,3,5);
 assert.equal(a.tag,b.tag);assert.notEqual(a.tag,pushSummary(2,3,2).tag);assert.notEqual(a.tag,pushSummary(1,4,2).tag);assert.match(b.body,/5/);assert.ok(!b.body.includes('monto'));
});
