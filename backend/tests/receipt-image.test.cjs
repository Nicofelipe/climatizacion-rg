require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

let writes = 0;
let uploadFailure = null;
let rolledBack = false;
let createFailure = null;
function stub(relativePath, exports) {
  const filename = require.resolve(relativePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stub('../src/services/expense.service.ts', {
  finishExpenseSync:async()=>{},
  createExpense: async () => { writes++; if(createFailure)throw createFailure; return { Id: 1 }; },
  getExpenseById: async () => ({ Id: 1, UserId:10, Status: 'APPROVED' }),
  rollbackCreatedExpense: async () => { rolledBack = true; },
});
stub('../src/services/googleDrive.service.ts', {
  uploadExpenseFileToGoogleDrive: async () => {
    writes++;
    if (uploadFailure) throw uploadFailure;
    return { id: 'test-image' };
  },
});
stub('../src/services/file.service.ts', {
  createExpenseFile: async () => { writes++; },
});
const { createExpenseController, updateExpenseController } =
  require('../src/controllers/expense.controller.ts');

const user = { companyId: 1, userId: 10, role: 'EMPLOYEE' };
const body = { expenseTypeId: '1', totalAmount: '1190', receiptNumber: 'TEST',
  expenseDate: '2026-01-10' };
function response() {
  return { statusCode: 0, payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; } };
}

test('receipt image validation and temporary file cleanup', async t => {
  await t.test('duplicate receipt is actionable Spanish and never uploads or replaces an image',async()=>{
    const folder=await fs.mkdtemp(path.join(os.tmpdir(),'rg-duplicate-')),temporaryPath=path.join(folder,'receipt.jpg');
    try{
      await fs.writeFile(temporaryPath,'fixture');writes=0;createFailure=new Error('RECEIPT_NUMBER_ALREADY_EXISTS');
      const res=response();await createExpenseController({user,body,file:{path:temporaryPath,filename:'receipt.jpg',mimetype:'image/jpeg'}},res);
      assert.equal(res.statusCode,409);assert.equal(res.payload.code,'RECEIPT_NUMBER_ALREADY_EXISTS');assert.match(res.payload.message,/Ya existe una boleta/);assert.equal(writes,1);
      await assert.rejects(fs.access(temporaryPath),{code:'ENOENT'});
    }finally{createFailure=null;await fs.rm(folder,{recursive:true,force:true});}
  });
  await t.test('revoked Drive authorization returns actionable error and rolls back receipt', async () => {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rg-receipt-'));
    const temporaryPath = path.join(folder, 'receipt.jpg');
    try {
      await fs.writeFile(temporaryPath, 'fixture');
      uploadFailure = Object.assign(new Error('invalid_grant'), {
        response: { data: { error: 'invalid_grant' } },
      });
      rolledBack = false;
      const res = response();
      await createExpenseController({ user, body, file: { path: temporaryPath,
        filename: 'receipt.jpg', mimetype: 'image/jpeg' } }, res);
      assert.equal(res.statusCode, 409);
      assert.equal(res.payload.code, 'DRIVE_RECONNECT_REQUIRED');
      assert.match(res.payload.message, /Contacta al encargado/);
      assert.equal(res.payload.message.includes('Perfil'), false);
      assert.equal(rolledBack, true);
      await assert.rejects(fs.access(temporaryPath), { code: 'ENOENT' });
    } finally {
      uploadFailure = null;
      await fs.rm(folder, { recursive: true, force: true });
    }
  });
  await t.test('missing image is rejected before SQL or Drive writes', async () => {
    writes = 0;
    const res = response();
    await createExpenseController({ user, body }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.payload.message, /imagen/);
    assert.equal(writes, 0);
  });

  for (const [name, controller, overrides, expected] of [
    ['invalid creation fields', createExpenseController, { body: {} }, 400],
    ['closed receipt year', createExpenseController, { body: {...body,expenseDate:'2020-01-01'} }, 400],
    ['unauthenticated creation', createExpenseController, { user: undefined }, 401],
    ['invalid update ID', updateExpenseController, { params: { id: 'invalid' } }, 400],
    ['invalid update fields', updateExpenseController, { body: {} }, 400],
    ['approved receipt update', updateExpenseController, {}, 409],
  ]) {
    await t.test(`${name} removes temporary image without writes`, async () => {
      const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rg-receipt-'));
      const temporaryPath = path.join(folder, 'receipt.jpg');
      try {
        await fs.writeFile(temporaryPath, 'temporary fixture');
        writes = 0;
        const res = response();
        await controller({ user, body, params: { id: '1' },
          file: { path: temporaryPath }, ...overrides }, res);
        assert.equal(res.statusCode, expected);
        assert.equal(writes, 0);
        await assert.rejects(fs.access(temporaryPath), { code: 'ENOENT' });
      } finally {
        await fs.rm(folder, { recursive: true, force: true });
      }
    });
  }

  await t.test('valid creation links image and cleans temporary file', async () => {
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rg-receipt-'));
    const temporaryPath = path.join(folder, 'receipt.jpg');
    try {
      await fs.writeFile(temporaryPath, 'temporary fixture');
      writes = 0;
      const res = response();
      await createExpenseController({ user, body, file: { path: temporaryPath,
        filename: 'receipt.jpg', originalname: 'receipt.jpg', mimetype: 'image/jpeg', size: 17 } }, res);
      assert.equal(res.statusCode, 201);
      assert.equal(writes, 3);
      await assert.rejects(fs.access(temporaryPath), { code: 'ENOENT' });
    } finally {
      await fs.rm(folder, { recursive: true, force: true });
    }
  });
});
