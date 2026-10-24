require('tsx/cjs');const{test}=require('node:test'),assert=require('node:assert/strict');
const{lockExpenseOperation}=require('../src/services/expenseOperationLock.service.ts');
test('an edit excludes sync/correction on the same receipt, with separate company scopes and idempotent release',()=>{
 const first=lockExpenseOperation(3,7);assert.ok(first);assert.equal(lockExpenseOperation(3,7),null);
 const other=lockExpenseOperation(4,7);assert.ok(other);other();
 first();const next=lockExpenseOperation(3,7);assert.ok(next);first();assert.equal(lockExpenseOperation(3,7),null);next();
});
