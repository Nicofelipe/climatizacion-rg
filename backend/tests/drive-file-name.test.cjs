require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const uuid = '65dcbef0-416d-4712-a611-fd21d58bfe09';
let ownerParams;
let change;
function stub(relativePath, exports) {
  const filename = require.resolve(relativePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stub('../src/database/sqlServer.ts', { executeQuery: async (sql, params) => {
  ownerParams = params;
  assert.match(sql, /u\.CompanyId = e\.CompanyId/);
  return [{ FirstName: 'María', LastName: 'Pérez', ReceiptNumber: 'B-123' }];
} });
stub('../src/services/storage.service.ts', { getCompanyStorage: async () => ({ Id: 1, RootFolderId: 'root' }) });
stub('../src/services/storageCredential.service.ts', { getStorageRefreshToken: async () => 'test-only' });
stub('googleapis', { google: {
  auth: { OAuth2: class { setCredentials() {} } },
  drive: () => ({ files: {
    list: async () => ({ data: { files: [{ id: 'destination' }] } }),
    get: async () => ({ data: { parents: ['old-month'],
      name: `20260101_MariaPerez_42_${uuid}.jpg`, mimeType: 'image/jpeg' } }),
    update: async input => { change = input; return { data: {} }; },
  } }),
} });
const { moveExpenseFileInGoogleDrive } = require('../src/services/googleDrive.service.ts');
test('pending receipt date change renames and moves existing image using scoped owner', async () => {
  await moveExpenseFileInGoogleDrive({ companyId: 3, expenseId: 42,
    fileId: 'existing-image', expenseDate: '2026-02-15' });
  assert.deepEqual(ownerParams, [42, 3]);
  assert.equal(change.fileId, 'existing-image');
  assert.equal(change.requestBody.name, '20260215_MARIAPEREZ_42_B-123.jpg');
  assert.equal(change.addParents, 'destination');
  assert.equal(change.removeParents, 'old-month');
});
