require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
let saved;
let fail = null;
const file = require.resolve('../src/services/expenseReview.service.ts');
require.cache[file] = { id: file, filename: file, loaded: true, exports: {
  reviewExpenses: async input => { saved = input; if (fail) throw fail; return input.expenseIds.map(Id => ({ Id })); },
} };
const { reviewExpensesController } = require('../src/controllers/expenseReview.controller.ts');
const admin = { companyId: 3, userId: 5, role: 'ADMIN' };
function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; } }; }
test('review authorization, validation and company isolation', async t => {
  for (const [name, user, body, expected] of [
    ['no session', undefined, { expenseIds: [1], decision: 'APPROVED' }, 401],
    ['employee cannot review', { ...admin, role: 'EMPLOYEE' }, { expenseIds: [1], decision: 'APPROVED' }, 403],
    ['reason mandatory', admin, { expenseIds: [1], decision: 'REJECTED', reason: '  ' }, 400],
    ['duplicate IDs', admin, { expenseIds: [1, 1], decision: 'APPROVED' }, 400],
    ['invalid status', admin, { expenseIds: [1], decision: 'PENDING' }, 400],
    ['empty selection', admin, { expenseIds: [], decision: 'APPROVED' }, 400],
    ['invalid ID', admin, { expenseIds: ['1'], decision: 'APPROVED' }, 400],
    ['oversized reason', admin, { expenseIds: [1], decision: 'REJECTED', reason: 'a'.repeat(1001) }, 400],
  ]) await t.test(name, async () => {
    saved = undefined;
    const res = response();
    await reviewExpensesController({ user, body }, res);
    assert.equal(res.code, expected);
    assert.equal(saved, undefined);
  });
  await t.test('rejects with trimmed reason and identity from session', async () => {
    const res = response();
    await reviewExpensesController({ user: admin, body: { expenseIds: [1, 2], decision: 'REJECTED', reason: ' Falta respaldo legible ', companyId: 99, reviewerId: 99 } }, res);
    assert.equal(res.body.updated, 2);
    assert.deepEqual(saved, { expenseIds: [1, 2], decision: 'REJECTED', reason: 'Falta respaldo legible', companyId: 3, reviewerId: 5 });
  });
  await t.test('conflict does not report success', async () => {
    fail = new Error('REVIEW_CONFLICT');
    try {
      const res = response();
      await reviewExpensesController({ user: admin, body: { expenseIds: [1], decision: 'APPROVED' } }, res);
      assert.equal(res.code, 409);
    } finally { fail = null; }
  });
});
