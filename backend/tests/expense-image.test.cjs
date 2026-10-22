require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
let visibleExpense = null;
let driveCalls = 0;
let lookup;
function stub(relativePath, exports) {
  const filename = require.resolve(relativePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stub('../src/services/expense.service.ts', {
  getExpenseById: async (...args) => { lookup = args; return visibleExpense; },
});
stub('../src/services/googleDrive.service.ts', {
  getGoogleDriveClient: async companyId => {
    driveCalls++;
    assert.equal(companyId, 3);
    return { drive: { files: { get: async input => {
      assert.equal(input.fileId, 'stored-file-id');
      return { data: Buffer.from('private-photo') };
    } } } };
  },
});
const { getExpenseImageController } = require('../src/controllers/expenseImage.controller.ts');
function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
}
test('private expense image endpoint', async t => {
  await t.test('requires authenticated session', async () => {
    driveCalls = 0;
    const res = response();
    await getExpenseImageController({ params: { id: '42' } }, res);
    assert.equal(res.code, 401);
    assert.equal(driveCalls, 0);
  });
  for (const id of ['0', 'abc', '-1']) await t.test(`reject invalid ID ${id}`, async () => {
    const res = response();
    await getExpenseImageController({ user: { companyId: 3, userId: 10, role: 'EMPLOYEE' }, params: { id } }, res);
    assert.equal(res.code, 400);
  });
  await t.test('inaccessible receipt never reaches Drive; lookup is scoped by session', async () => {
    visibleExpense = null; driveCalls = 0;
    const res = response();
    await getExpenseImageController({ user: { companyId: 3, userId: 10, role: 'EMPLOYEE' },
      params: { id: '42' }, query: { companyId: 99, userId: 99, fileId: 'untrusted-file' } }, res);
    assert.equal(res.code, 404);
    assert.deepEqual(lookup, [3, 42, 10, 'EMPLOYEE']);
    assert.equal(driveCalls, 0);
  });
  await t.test('authorized image comes from stored file ID and is not cacheable', async () => {
    visibleExpense = { file: { Provider: 'GOOGLE_DRIVE', ProviderFileId: 'stored-file-id', MimeType: 'image/jpeg' } };
    const res = response();
    await getExpenseImageController({ user: { companyId: 3, userId: 10, role: 'EMPLOYEE' }, params: { id: '42' } }, res);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(res.body.dataUri, `data:image/jpeg;base64,${Buffer.from('private-photo').toString('base64')}`);
  });
});
