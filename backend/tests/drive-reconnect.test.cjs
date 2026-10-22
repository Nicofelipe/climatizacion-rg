require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
let savedCredential;
let savedFolder;
function stub(relativePath, exports) {
  const filename = require.resolve(relativePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stub('../src/config/googleOAuth.ts', { googleOAuthClient: {
  getToken: async () => ({ tokens: { refresh_token: 'test-only-token' } }),
} });
stub('../src/services/storage.service.ts', {
  getCompanyStorage: async () => ({ Id: 5, RootFolderId: 'existing-company-folder' }),
  ensureGoogleDriveStorage: async () => ({ Id: 5 }),
  upsertGoogleDriveStorage: async (companyId, folder) => { savedFolder = { companyId, folder }; },
});
stub('../src/services/storageCredential.service.ts', {
  upsertStorageCredential: async (id, token) => { savedCredential = { id, token }; },
});
stub('../src/services/googleDrive.service.ts', {});
const { googleDriveCallbackController, updateGoogleDriveStorageController } = require('../src/controllers/storage.controller.ts');
test('Drive reconnect retains configured folder without Picker parameters', async () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'isolated-drive-test-secret';
  try {
    const state = jwt.sign({ companyId: 3, userId: 7, purpose: 'GOOGLE_DRIVE_OAUTH' }, process.env.JWT_SECRET);
    const res = { status(code) { this.code = code; return this; },
      type() { return this; }, send(body) { this.body = body; return this; },
      json(body) { this.body = body; return this; } };
    await googleDriveCallbackController({ query: { code: 'test-code', state, picked_file_ids: 'attacker-folder' } }, res);
    assert.equal(res.code, 200);
    assert.equal(savedFolder, undefined);
    assert.equal(savedCredential.id, 5);
    assert.match(res.body, /Google Drive conectado/);
    assert.equal(res.body.includes('test-only-token'), false);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});

test('administrator cannot change folder through API', async () => {
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await updateGoogleDriveStorageController({ user: { companyId: 3, role: 'ADMIN' },
    body: { folderUrl: 'https://drive.google.com/drive/folders/different-folder' } }, res);
  assert.equal(res.code, 403);
  assert.equal(res.body.code, 'STORAGE_FOLDER_LOCKED');
  assert.equal(savedFolder, undefined);
});
