require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
let scope;
let companyParams;
function stub(relativePath, exports) {
  const filename = require.resolve(relativePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stub('../src/database/sqlServer.ts', { executeQuery: async (sql, params) => {
  companyParams = params; return [{ Name: 'Empresa de prueba' }];
} });
stub('../src/services/expense.service.ts', { getExpenses: async (...args) => { scope = args; return []; } });
const { summarizeExpenses, currentChileMonth, getDashboard } = require('../src/services/dashboard.service.ts');
const expense = (Id, ExpenseDate, Status, TotalAmount, ExpenseTypeName = 'Combustible') => ({
  Id, ExpenseDate, Status, TotalAmount, ExpenseTypeName,
  ReceiptNumber: `B-${Id}`, NetAmount: TotalAmount, VatAmount: 0,
});
const receipts = [
  expense(1, '2026-10-05', 'APPROVED', 100),
  expense(3, '2026-10-20', 'PENDING', 50, 'Colación'),
  expense(2, '2026-10-20', 'REJECTED', 1000),
  expense(4, '2026-09-30', 'APPROVED', 75),
  expense(5, '2026-11-01', 'PENDING', 10000),
];
test('monthly totals exclude rejected receipts but show their count and amount', () => {
  const summary = summarizeExpenses(receipts, '2026-10');
  assert.equal(summary.total, 150);
  assert.equal(summary.receiptCount, 3);
  assert.deepEqual(summary.states.find(s => s.status === 'REJECTED'), { status: 'REJECTED', count: 1, amount: 1000 });
  assert.equal(summary.previousTotal, 75);
  assert.equal(summary.changePercent, 100);
  assert.equal(summary.categories.reduce((sum, item) => sum + item.amount, 0), 150);
  assert.equal(summary.pendingAllTime, 2);
});
test('recent receipts sorted by date descending then ID descending', () => {
  assert.deepEqual(summarizeExpenses(receipts, '2026-10').recent.map(item => item.id), [3, 2, 1]);
});
test('trend has six consecutive months including zeros and year boundary', () => {
  const summary = summarizeExpenses(receipts, '2027-02');
  assert.deepEqual(summary.trend.map(item => item.month), ['2026-09','2026-10','2026-11','2026-12','2027-01','2027-02']);
  assert.equal(summary.trend[1].amount, 150);
});
test('empty month has no fabricated totals or percentage', () => {
  const summary = summarizeExpenses([], '2026-10');
  assert.equal(summary.total, 0);
  assert.equal(summary.changePercent, null);
  assert.deepEqual(summary.categories, []);
  assert.deepEqual(summary.recent, []);
});
test('SQL Date values and Chile month boundary are handled consistently', () => {
  assert.equal(currentChileMonth(new Date('2026-11-01T01:00:00Z')), '2026-10');
  assert.equal(summarizeExpenses([expense(1, new Date('2026-10-01T00:00:00Z'), 'APPROVED', 10)], '2026-10').total, 10);
});
test('dashboard company and expense queries use authenticated scope', async () => {
  for (const role of ['EMPLOYEE', 'ADMIN']) {
    const result = await getDashboard(3, 10, role, '2026-10');
    assert.deepEqual(companyParams, [3]);
    assert.deepEqual(scope, [3, 10, role]);
    assert.equal(result.scope, role === 'ADMIN' ? 'company' : 'personal');
    assert.equal(result.companyName, 'Empresa de prueba');
  }
});

test('annual summary uses same elapsed months and excludes future months', () => {
  const data = [...receipts,
    expense(10, '2025-01-10', 'APPROVED', 50),
    expense(11, '2025-11-10', 'APPROVED', 999),
  ];
  const result = summarizeExpenses(data, '2026-10', 'year', new Date('2026-10-22T15:00:00Z'));
  assert.equal(result.total, 225); // September 75 and October 150; no November 10000.
  assert.equal(result.previousTotal, 50); // Compare Jan–Oct, not all previous year.
  assert.equal(result.receiptCount, 4);
  assert.equal(result.trend.length, 10);
  assert.equal(result.trend[0].month, '2026-01');
  assert.equal(result.trend[9].month, '2026-10');
});

test('past annual period contains all twelve months', () => {
  const result = summarizeExpenses([expense(1, '2025-12-15', 'APPROVED', 500)], '2025-03', 'year', new Date('2026-10-22T15:00:00Z'));
  assert.equal(result.total, 500);
  assert.equal(result.trend.length, 12);
  assert.equal(result.trend[11].month, '2025-12');
});

test('daily chart groups receipts by date and excludes rejected amounts', () => {
  const result = summarizeExpenses(receipts, '2026-10', 'month', new Date('2026-10-22T15:00:00Z'));
  assert.equal(result.daily.length, 22);
  assert.equal(result.daily.find(point => point.date === '2026-10-20').amount, 50);
  assert.equal(result.daily.reduce((sum, point) => sum + point.amount, 0), result.total);
  assert.equal(result.daily.find(point => point.date === '2026-10-01').amount, 0);
});
test('historical month includes all calendar days, including leap day', () => {
  const result = summarizeExpenses([], '2024-02', 'month', new Date('2026-10-22T15:00:00Z'));
  assert.equal(result.daily.length, 29);
});
test('existing future-dated receipt in current month is not hidden from chart totals', () => {
  const result = summarizeExpenses([expense(1, '2026-10-30', 'PENDING', 500)], '2026-10', 'month', new Date('2026-10-22T15:00:00Z'));
  assert.equal(result.daily.length, 30);
  assert.equal(result.daily.reduce((sum, point) => sum + point.amount, 0), result.total);
});
