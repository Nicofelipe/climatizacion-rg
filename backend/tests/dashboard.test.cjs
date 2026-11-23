require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
let scope;
let companyParams;
let range;
function stub(relativePath, exports) {
  const filename = require.resolve(relativePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stub('../src/database/sqlServer.ts', { executeQuery: async (sql, params) => {
  companyParams = params; return [{ Name: 'Empresa de prueba' }];
} });
stub('../src/services/expense.service.ts', { getExpenses: async (...args) => { scope = args.slice(0, 3); range = args[3]; return []; }, countPending: async () => 4 });
let budgetOwner;
stub('../src/services/budget.service.ts', { getBudget: async (company, owner) => { budgetOwner = owner; return null; } });
const { summarizeExpenses, currentChileMonth, getDashboard, budgetUsage, dashboardRange } = require('../src/services/dashboard.service.ts');
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
test('administrator personal report uses owner scope and company report uses company scope',async()=>{
  const personal=await getDashboard(3,5,'ADMIN','2026-10','month','personal');
  assert.equal(personal.scope,'personal');assert.deepEqual(scope,[3,5,'EMPLOYEE']);
  const company=await getDashboard(3,5,'ADMIN','2026-10','month','company');
  assert.equal(company.scope,'company');assert.deepEqual(scope,[3,5,'ADMIN']);assert.equal(budgetOwner,null);assert.equal(company.pendingAllTime,4);assert.deepEqual(range,{from:'2026-05-01',to:'2026-10-31'});
  const employee=await getDashboard(3,6,'EMPLOYEE','2026-10','month','company');
  assert.equal(employee.scope,'personal');assert.equal(budgetOwner,6);assert.deepEqual(employee.workers,[]);assert.deepEqual(scope,[3,6,'EMPLOYEE']);
});
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

test('an ongoing month is compared with the same stretch of the previous month', () => {
  const data = [expense(1, '2026-10-05', 'APPROVED', 100), expense(2, '2026-09-08', 'APPROVED', 50), expense(3, '2026-09-25', 'APPROVED', 900)];
  const result = summarizeExpenses(data, '2026-10', 'month', new Date('2026-10-10T15:00:00Z'));
  assert.equal(result.previousTotal, 50);
  assert.equal(result.changePercent, 100);
  assert.equal(result.comparisonLabel, 'mismo tramo del mes anterior');
  const closed = summarizeExpenses(data, '2026-10', 'month', new Date('2026-11-10T15:00:00Z'));
  assert.equal(closed.previousTotal, 950);
  assert.equal(closed.comparisonLabel, 'mes anterior');
});
test('an ongoing year stops the previous year at the same day, not at the end of the month', () => {
  const data = [expense(1, '2026-10-05', 'APPROVED', 100), expense(2, '2025-10-08', 'APPROVED', 50), expense(3, '2025-10-25', 'APPROVED', 900)];
  assert.equal(summarizeExpenses(data, '2026-10', 'year', new Date('2026-10-10T15:00:00Z')).previousTotal, 50);
});
test('the 31st is compared with the last day of a shorter month', () => {
  const data = [expense(1, '2026-02-28', 'APPROVED', 70), expense(2, '2026-03-31', 'APPROVED', 70)];
  assert.equal(summarizeExpenses(data, '2026-03', 'month', new Date('2026-03-31T15:00:00Z')).previousTotal, 70);
});
test('budget usage covers the elapsed months and may exceed 100%', () => {
  assert.equal(budgetUsage(null, 500, 1), null);
  assert.deepEqual(budgetUsage(1000, 1250, 1), { monthly: 1000, amount: 1000, spent: 1250, remaining: -250, percent: 125 });
  assert.deepEqual(budgetUsage(1000, 2500, 10), { monthly: 1000, amount: 10000, spent: 2500, remaining: 7500, percent: 25 });
});
test('only the dates needed for the summary are read', () => {
  assert.deepEqual(dashboardRange('2027-02', 'month'), { from: '2026-09-01', to: '2027-02-28' });
  assert.deepEqual(dashboardRange('2026-10', 'year'), { from: '2025-01-01', to: '2026-12-31' });
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
