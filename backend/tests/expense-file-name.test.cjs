require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildExpenseFileName } = require('../src/utils/expenseFileName.ts');
const base = { expenseDate: '2026-01-09', employeeName: 'Nicolás Pérez Soto',
  expenseId: 42, receiptNumber: 'b-123', mimeType: 'image/jpeg', sourceName: 'IMG_123.jpeg' };

test('standard date, normalized worker name, receipt ID and image version', () => {
  const name = buildExpenseFileName({ ...base, version: 'version1' });
  assert.equal(name, '20260109_NICOLASPEREZSOTO_42_B-123.jpg');
});
test('same receipt produces the same standard name', () => {
  assert.equal(buildExpenseFileName(base), buildExpenseFileName(base));
});
test('different receipts from same worker stay distinct', () => {
  assert.notEqual(buildExpenseFileName({ ...base, version: 'same' }),
    buildExpenseFileName({ ...base, expenseId: 43, version: 'same' }));
});
test('date edits preserve image version and change date prefix', () => {
  const name = buildExpenseFileName({ ...base, version: 'persistent-image' });
  const changed = buildExpenseFileName({ ...base, expenseDate: '2026-02-10', version: 'persistent-image' });
  assert.equal(changed, name.replace('20260109', '20260210'));
});
test('untrusted paths and accents cannot enter generated file name', () => {
  const name = buildExpenseFileName({ ...base, employeeName: '../../María / González',
    sourceName: '../../photo.png', mimeType: 'image/png', version: 'safe' });
  assert.equal(name, '20260109_MARIAGONZALEZ_42_B-123.png');
});
test('invalid dates and identifiers are rejected', () => {
  for (const expenseDate of ['2026-02-30', '09-01-2026', '2026-01-09T23:00:00Z']) {
    assert.throws(() => buildExpenseFileName({ ...base, expenseDate }));
  }
  assert.throws(() => buildExpenseFileName({ ...base, expenseId: 0 }));
  assert.throws(() => buildExpenseFileName({ ...base, receiptNumber: '' }));
});
test('same input date is not changed by timezone conversion', () => {
  assert.match(buildExpenseFileName(base), /^20260109_/);
});
