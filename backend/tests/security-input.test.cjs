require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDriveAttempt,consumeDriveAttempt}=require('../src/services/driveOAuthState.service.ts');
const {validExpenseFields}=require('../src/utils/expenseInput.ts');
test('Drive states expire and cannot be reused or substituted',()=>{
 const state=createDriveAttempt(3,5,7,100);assert.deepEqual(consumeDriveAttempt(state,200),{companyId:3,userId:5,passwordVersion:7,expires:600100});
 assert.throws(()=>consumeDriveAttempt(state,300),/INVALID/);
 assert.throws(()=>consumeDriveAttempt(createDriveAttempt(3,5,7,0),600000),/INVALID/);
 assert.throws(()=>consumeDriveAttempt('unknown'),/INVALID/);
});
test('expense input rejects objects, impossible dates and unbounded monetary or text inputs',()=>{
 assert.equal(validExpenseFields('ABC','2024-02-29',1190,null),true);
 for(const [receipt,date,amount,description]of [[{},'2026-01-01',1190,null],['ABC','2026-02-29',1190,null],['ABC','2026-01-01',Infinity,null],['ABC','2026-01-01',1.5,null],['ABC','2026-01-01',1190,{}],['x'.repeat(51),'2026-01-01',1190,null]])assert.equal(validExpenseFields(receipt,date,amount,description),false);
});
