require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { availablePeriodOptions } = require('../../mobile/src/utils/periodOptions.ts');
test('only current or previous years and elapsed months can be selected', () => {
  const now = new Date('2026-10-22T15:00:00Z');
  const current = availablePeriodOptions(2026, now);
  assert.equal(current.years[0], '2026');
  assert.equal(current.years.includes('2027'), false);
  assert.equal(current.months.length, 10);
  assert.equal(current.months.includes('11'), false);
  assert.equal(availablePeriodOptions(2025, now).months.length, 12);
  assert.deepEqual(availablePeriodOptions(2027, now).months, []);
});
test('next Chilean year becomes available automatically at midnight', () => {
  const before = availablePeriodOptions(2026, new Date('2027-01-01T02:59:00Z'));
  const after = availablePeriodOptions(2027, new Date('2027-01-01T03:01:00Z'));
  assert.equal(before.currentYear, 2026);
  assert.equal(after.currentYear, 2027);
  assert.equal(after.years[0], '2027');
  assert.deepEqual(after.months, ['01']);
});
