// Integration tests: only table variables are changed, never application tables.
require('dotenv').config({ quiet: true });
require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const database = require('../src/database/sqlServer.ts');
const sqlDriver = require('msnodesqlv8');
const connectionString = 'Driver={ODBC Driver 18 for SQL Server};Server=' +
  process.env.DB_SERVER + ';Database=' + process.env.DB_DATABASE +
  ';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
function executeRealQuery(sql, params) {
  return new Promise((resolve, reject) => {
    const allRows = [];
    sqlDriver.query(connectionString, sql, params, (error, rows, more) => {
      if (error) return reject(error);
      allRows.push(...(rows || []));
      if (!more) resolve(allRows);
    });
  });
}

const fixtureQuery = async (sql, params) => {
  if (sql.includes('SELECT TOP 1 Id')) return []; // No duplicate receipt in fixture.
  assert.match(sql, /UPDATE dbo\.Expense/);
  const fixture = `
    SET NOCOUNT ON;
    CREATE TABLE #Expense (
      Id int, CompanyId int, UserId int, ExpenseTypeId int, SupplierId int,
      ReceiptNumber nvarchar(50), ExpenseDate date, TaxRate decimal(5,2),
      NetAmount decimal(18,2), VatAmount decimal(18,2), TotalAmount decimal(18,2),
      Description nvarchar(500), Status nvarchar(20), IsDeleted bit,
      CreatedAt datetime2, UpdatedAt datetime2, DriveSyncPending bit DEFAULT 0
    );
    CREATE TABLE #AuditLog (Id int IDENTITY,CompanyId int,UserId int,Action nvarchar(100),Entity nvarchar(100),EntityId int,BeforeData nvarchar(max),AfterData nvarchar(max),Reason nvarchar(1000),CreatedAt datetime2);
    INSERT INTO #Expense (Id, CompanyId, UserId, ExpenseTypeId, ReceiptNumber,
      ExpenseDate, TotalAmount, Status, IsDeleted, CreatedAt)
    VALUES (101, 1, 10, 1, N'ORIGINAL', '2026-01-10', 1190, ?, ?, SYSDATETIME());
  `;
  return executeRealQuery(fixture + sql.replaceAll('dbo.Expense', '#Expense').replaceAll('dbo.AuditLog','#AuditLog'),
    [currentStatus, deleted, ...params]);
};

require.cache[require.resolve('../src/database/sqlServer.ts')].exports = {
  ...database, executeQuery: fixtureQuery,
};

const { updateExpense, deleteExpense } = require('../src/services/expense.service.ts');
let currentStatus = 'PENDING';
let deleted = 0;
const cases = [
  ['employee owns pending receipt', 'EMPLOYEE', 1, 10, 'PENDING', 0, true],
  ['employee cannot change coworker receipt', 'EMPLOYEE', 1, 11, 'PENDING', 0, false],
  ['employee cannot cross company boundary', 'EMPLOYEE', 2, 10, 'PENDING', 0, false],
  ['admin can manage company pending receipt', 'ADMIN', 1, 11, 'PENDING', 0, true],
  ['admin cannot cross company boundary', 'ADMIN', 2, 11, 'PENDING', 0, false],
  ['employee cannot change approved receipt', 'EMPLOYEE', 1, 10, 'APPROVED', 0, false],
  ['admin cannot change approved receipt', 'ADMIN', 1, 11, 'APPROVED', 0, false],
  ['employee cannot change rejected receipt', 'EMPLOYEE', 1, 10, 'REJECTED', 0, false],
  ['admin cannot change rejected receipt', 'ADMIN', 1, 11, 'REJECTED', 0, false],
  ['deleted receipt stays deleted', 'ADMIN', 1, 11, 'PENDING', 1, false],
];

test('SQL Server expense authorization with isolated fixtures', { timeout: 30000 }, async t => {
  for (const [name, role, companyId, userId, status, isDeleted, allowed] of cases) {
    for (const operation of ['update', 'delete']) {
      await t.test(`${operation}: ${name}`, async () => {
        currentStatus = status;
        deleted = isDeleted;
        const result = operation === 'delete'
          ? await deleteExpense(companyId, 101, userId, role)
          : await updateExpense({ companyId, userId, role, expenseId: 101,
              expenseTypeId: 1, receiptNumber: 'CHANGED', expenseDate: '2026-01-11',
              totalAmount: 2380 });
        assert.equal(result !== null, allowed);
        if (allowed) assert.equal(result.Id, 101);
      });
    }
  }
});
