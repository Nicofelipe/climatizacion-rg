// SQL integration uses connection-local temporary tables, never application data.
require('dotenv').config({ quiet: true });
require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const sql = require('msnodesqlv8');
const cs = 'Driver={ODBC Driver 18 for SQL Server};Server=' + process.env.DB_SERVER +
  ';Database=' + process.env.DB_DATABASE + ';Trusted_Connection=Yes;TrustServerCertificate=Yes;Connection Timeout=5;';
const fixture = `SET NOCOUNT ON;
  CREATE TABLE #Role (Id int, Name nvarchar(20), IsActive bit);
  CREATE TABLE #AppUser (Id int, CompanyId int, RoleId int, IsActive bit);
  CREATE TABLE #Expense (Id int, CompanyId int, Status nvarchar(20), IsDeleted bit,
    RejectionReason nvarchar(1000), ReviewedByUserId int, ReviewedAt datetime2, UpdatedAt datetime2);
  CREATE TABLE #AuditLog (CompanyId int, UserId int, Action nvarchar(100), Entity nvarchar(100), EntityId int);
  INSERT INTO #Role VALUES (1,N'ADMIN',1),(2,N'EMPLOYEE',1);
  INSERT INTO #AppUser VALUES (5,3,1,1),(6,3,2,1),(7,4,1,1);
  INSERT INTO #Expense (Id,CompanyId,Status,IsDeleted) VALUES
    (11,3,N'PENDING',0),(12,3,N'APPROVED',0),(13,3,N'PENDING',0),(21,4,N'PENDING',0);
`;
const file = require.resolve('../src/database/sqlServer.ts');
require.cache[file] = { id: file, filename: file, loaded: true, exports: {
  executeQuery: async (statement, params) => {
    const isolated = statement.replaceAll('dbo.Expense', '#Expense').replaceAll('dbo.AppUser', '#AppUser')
      .replaceAll('dbo.Role', '#Role').replaceAll('dbo.AuditLog', '#AuditLog')
      .replace('SELECT Id FROM @Changed ORDER BY Id;', `SELECT c.Id,e.Status,e.RejectionReason,e.ReviewedByUserId,
        (SELECT COUNT(*) FROM #AuditLog) AS AuditCount FROM @Changed c JOIN #Expense e ON e.Id=c.Id ORDER BY c.Id;`);
    return new Promise((resolve, reject) => {
      const results = [];
      sql.query(cs, fixture + isolated, params, (error, rows, more) => {
        if (error) return reject(error);
        results.push(...(rows ?? []));
        if (!more) resolve(results);
      });
    });
  },
} };
const { reviewExpenses } = require('../src/services/expenseReview.service.ts');
const input = { companyId: 3, reviewerId: 5, expenseIds: [11], decision: 'APPROVED', reason: null };
test('SQL review transaction and authorization', { timeout: 30000 }, async t => {
  await t.test('approve pending batch and audit every record', async () => {
    const rows = await reviewExpenses({ ...input, expenseIds: [11,13] });
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.Status, 'APPROVED'); assert.equal(row.AuditCount, 2);
      assert.equal(row.ReviewedByUserId, 5);
    }
  });
  await t.test('reject saves reason and reviewer', async () => {
    const rows = await reviewExpenses({ ...input, decision: 'REJECTED', reason: 'Foto ilegible' });
    assert.equal(rows[0].Status, 'REJECTED');
    assert.equal(rows[0].RejectionReason, 'Foto ilegible');
    assert.equal(rows[0].AuditCount, 1);
  });
  for (const [name, overrides, expected] of [
    ['employee cannot review', { reviewerId: 6 }, /REVIEW_FORBIDDEN/],
    ['admin from other company cannot review', { reviewerId: 7 }, /REVIEW_FORBIDDEN/],
    ['cross-company receipt blocks whole batch', { expenseIds: [11,21] }, /REVIEW_CONFLICT/],
    ['already reviewed receipt blocks whole batch', { expenseIds: [11,12] }, /REVIEW_CONFLICT/],
  ]) await t.test(name, async () => {
    await assert.rejects(reviewExpenses({ ...input, ...overrides }), expected);
  });
});
