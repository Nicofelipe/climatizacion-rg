require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { driveUnavailableMessage } = require('../src/utils/storageError.ts');
test('only administrator receives reconnection instructions', () => {
  assert.match(driveUnavailableMessage('ADMIN'), /Perfil/);
  for (const role of ['EMPLOYEE', '', 'UNKNOWN']) {
    const message = driveUnavailableMessage(role);
    assert.match(message, /Contacta al encargado/);
    assert.equal(message.includes('Perfil'), false);
  }
});
