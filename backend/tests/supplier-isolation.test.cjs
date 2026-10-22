require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
let last;
const db=require.resolve('../src/database/sqlServer.ts');require.cache[db]={id:db,filename:db,loaded:true,exports:{executeQuery:async(sql,params)=>{last={sql,params};assert.match(sql,/FROM dbo.Supplier WHERE Id=\? AND CompanyId=\? AND IsActive=1/);return [];}}};
const {createExpense,updateExpense}=require('../src/services/expense.service.ts');
test('foreign or inactive suppliers are rejected before any receipt write',async()=>{
 const input={companyId:3,userId:5,role:'ADMIN',expenseId:7,supplierId:99,receiptNumber:'TEST',expenseDate:'2026-01-01',expenseTypeId:1,totalAmount:1190};
 for(const fn of [createExpense,updateExpense]){await assert.rejects(fn(input),/INVALID_SUPPLIER_REFERENCE/);assert.deepEqual(last.params,[99,3]);}
});
