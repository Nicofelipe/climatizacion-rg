require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validPending}=require('../../mobile/src/utils/pendingCaptureRules.ts');
const now=Date.UTC(2026,10,22,20),base={userId:5,companyId:3,fields:{receiptNumber:'77'},touched:['receiptNumber',4],at:now-60000};
const check=change=>validPending(JSON.stringify({...base,...change}),5,3,now);
test('a pending photo is only recovered by the same person and company, for a short time',()=>{
 assert.deepEqual(check({}),{userId:5,companyId:3,editId:undefined,camera:false,at:now-60000,fields:{receiptNumber:'77'},touched:['receiptNumber']});
 assert.equal(check({editId:9}).editId,9);assert.equal(check({camera:true}).camera,true);assert.equal(check({camera:'si'}).camera,false);
 for(const bad of [{userId:6},{companyId:4},{at:now-31*60000},{at:now+120000},{at:'x'},{editId:-1},{editId:'9'},{fields:null},{touched:'x'}])assert.equal(check(bad),null,JSON.stringify(bad));
 for(const text of ['','{','null','[]','5'])assert.equal(validPending(text,5,3,now),null);
});
