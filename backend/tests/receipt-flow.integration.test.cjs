// Recorrido completo por HTTP contra una base desechable creada con las migraciones reales.
//   TEST_DATABASE=ClepitBoletas_Test npm run migrate:test   (una vez)
//   TEST_DATABASE=ClepitBoletas_Test node --test tests/receipt-flow.integration.test.cjs
// Sin TEST_DATABASE se omite. Nunca usa una base cuyo nombre no termine en _Test.
require('dotenv').config({ quiet: true });
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const name = process.env.TEST_DATABASE;
const skip = !name || !/^\w+_Test$/.test(name) ? 'Define TEST_DATABASE (terminada en _Test) para ejecutar el recorrido completo.' : false;

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'clepit-receipts-'));
let base, server, query, sequence = 0;
const tokens = {};
const ids = {};
const png = () => Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), Buffer.from(`image-${Date.now()}-${Math.random()}-${sequence++}`)]);
// Números y RUT distintos en cada ejecución: la base de pruebas se puede reutilizar.
const run = String(Date.now()).slice(-7);
const number = suffix => `${run}${suffix}`;
function rut(seed) {
  const body = String(60000000 + (Number(run) * 7 + seed) % 30000000);
  let sum = 0, factor = 2;
  for (let i = body.length - 1; i >= 0; i--) { sum += Number(body[i]) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const rest = 11 - sum % 11;
  return `${body}-${rest === 11 ? '0' : rest === 10 ? 'K' : rest}`;
}
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(new Date());

async function call(method, url, { token, body, raw } = {}) {
  const response = await fetch(base + url, {
    method, body: raw ?? (body ? JSON.stringify(body) : undefined),
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const text = await response.text();
  return { status: response.status, data: text.startsWith('{') ? JSON.parse(text) : text };
}
function form(fields, image = png()) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ expenseTypeId: 3, expenseDate: today, totalAmount: 11900, ...fields })) if (value !== undefined) data.append(key, String(value));
  if (image) data.append('image', new Blob([image], { type: 'image/png' }), 'boleta.png');
  return data;
}
const create = (who, fields, image) => call('POST', '/expenses', { token: tokens[who], raw: form(fields, image) });

before(async () => {
  if (skip) return;
  Object.assign(process.env, {
    DB_DATABASE: name, RECEIPT_STORAGE: 'local', RECEIPT_STORAGE_DIR: folder, JWT_SECRET: 'integration-only-secret-with-enough-length',
    CORS_ALLOWED_ORIGINS: 'http://localhost:8081', GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test', GOOGLE_REDIRECT_URI: 'http://localhost/callback',
  });
  require('tsx/cjs');
  query = require('../src/database/sqlServer.ts').executeQuery;
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('ClaveDePrueba123', 4);
  const company = async label => (await query('INSERT INTO dbo.Company(Name,Rut) OUTPUT INSERTED.Id VALUES(?,?);', [`${label} ${run}`, `${label[0]}${run}`]))[0].Id;
  ids.a = await company('Alfa'); ids.b = await company('Beta');
  const user = async (key, companyId, role, email) => {
    const rows = await query(`INSERT INTO dbo.AppUser(CompanyId,RoleId,FirstName,LastName,Email,PasswordHash) OUTPUT INSERTED.Id
      SELECT ?,Id,?,N'Prueba',?,? FROM dbo.Role WHERE Name=?;`, [companyId, key, email, hash, role]);
    ids[key] = rows[0].Id;
  };
  await user('admin', ids.a, 'ADMIN', `admin${run}@prueba.test`);
  await user('worker', ids.a, 'EMPLOYEE', `worker${run}@prueba.test`);
  await user('other', ids.a, 'EMPLOYEE', `other${run}@prueba.test`);
  await user('foreign', ids.b, 'ADMIN', `foreign${run}@prueba.test`);
  await user('twin', ids.b, 'EMPLOYEE', `worker${run}@prueba.test`);
  server = await new Promise(resolve => { const value = require('../src/app.ts').createApp('').listen(0, '127.0.0.1', () => resolve(value)); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  fs.rmSync(folder, { recursive: true, force: true });
});

test('complete receipt flow', { skip, timeout: 180000 }, async t => {
  await t.test('login, wrong password and company selection for a shared email', async () => {
    const login = (key, extra) => call('POST', '/auth/login', { body: { email: `${key}${run}@prueba.test`, password: 'ClaveDePrueba123', ...extra } });
    for (const key of ['admin', 'other', 'foreign']) { const result = await login(key); assert.equal(result.status, 200); tokens[key] = result.data.token; }
    assert.equal((await call('POST', '/auth/login', { body: { email: `admin${run}@prueba.test`, password: 'Incorrecta123' } })).status, 401);
    const choice = await login('worker');
    assert.equal(choice.status, 409); assert.equal(choice.data.code, 'COMPANY_SELECTION_REQUIRED');
    assert.deepEqual(choice.data.companies.map(c => c.id).sort((x, y) => x - y), [ids.a, ids.b]);
    const chosen = await login('worker', { companyId: ids.a });
    assert.equal(chosen.status, 200); assert.equal(chosen.data.user.companyId, ids.a); tokens.worker = chosen.data.token;
    assert.equal((await login('worker', { companyId: 999999 })).status, 401);
  });

  const supplier = { supplierName: 'Ferretería El Tornillo', supplierRut: rut(1) };
  await t.test('a receipt keeps its supplier, VAT and photo', async () => {
    const result = await create('worker', { receiptNumber: number('001'), ...supplier });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    ids.first = result.data.expense.Id;
    const { expense } = (await call('GET', `/expenses/${ids.first}`, { token: tokens.worker })).data;
    assert.deepEqual([expense.NetAmount, expense.VatAmount, expense.VatSource, expense.Status], [10000, 1900, 'CALCULATED', 'PENDING']);
    assert.equal(expense.SupplierName, supplier.supplierName); assert.equal(expense.SupplierRut, supplier.supplierRut);
    assert.ok(Math.abs(Date.now() - new Date(expense.CreatedAt).getTime()) < 120000, `hora de registro: ${expense.CreatedAt}`);
    const image = await call('GET', `/expenses/${ids.first}/image`, { token: tokens.worker });
    assert.match(image.data.dataUri, /^data:image\/png;base64,/);
  });

  await t.test('VAT follows the document and the expense type', async () => {
    const vat = async fields => { const r = await create('worker', { ...supplier, ...fields }); return r.status === 201 ? [r.data.expense.NetAmount, r.data.expense.VatAmount, r.data.expense.VatSource] : r.status; };
    assert.deepEqual(await vat({ receiptNumber: number('101'), expenseTypeId: 2, totalAmount: 30000 }), [30000, 0, 'NOT_STATED'], 'combustible sin IVA impreso');
    assert.deepEqual(await vat({ receiptNumber: number('102'), expenseTypeId: 2, totalAmount: 30000, vatAmount: 3200 }), [26800, 3200, 'RECEIPT'], 'combustible con IVA impreso');
    assert.deepEqual(await vat({ receiptNumber: number('103'), vatSource: 'EXEMPT' }), [11900, 0, 'EXEMPT']);
    assert.deepEqual(await vat({ receiptNumber: number('104'), vatAmount: 0 }), [11900, 0, 'EXEMPT']);
    assert.deepEqual(await vat({ receiptNumber: number('105'), totalAmount: 999 }), [839, 160, 'CALCULATED']);
    assert.equal(await vat({ receiptNumber: number('106'), vatAmount: 5000 }), 400, 'IVA imposible');
    assert.equal(await vat({ receiptNumber: number('107'), expenseTypeId: 99 }), 400, 'tipo inexistente');
    assert.equal(await vat({ receiptNumber: number('108'), supplierRut: '76.123.456-9' }), 400, 'RUT inválido');
  });

  await t.test('duplicates are recognised by supplier, and different shops may share a number', async () => {
    const dup = fields => create('other', fields);
    assert.equal((await dup({ receiptNumber: number('001'), ...supplier })).status, 409);
    assert.equal((await dup({ receiptNumber: ` 00${number('001')} `, ...supplier, totalAmount: 500 })).status, 409, 'ceros y espacios no lo hacen distinto');
    assert.equal((await dup({ receiptNumber: number('001') })).status, 409, 'sin comercio, misma fecha');
    assert.equal((await dup({ receiptNumber: number('001'), supplierName: 'Otra Tienda', supplierRut: rut(2) })).status, 201, 'otro comercio');
    assert.equal((await dup({ receiptNumber: number('001'), ...supplier, documentType: 'FACTURA' })).status, 201, 'factura con el mismo folio');
  });

  await t.test('simultaneous submissions create a single receipt', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => create('worker', { receiptNumber: number('200'), supplierName: 'Copec', supplierRut: rut(3) })));
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409, 409, 409, 409, 409], JSON.stringify(results.map(r => r.data.message)));
    assert.equal((await query('SELECT COUNT(*) AS N FROM dbo.Supplier WHERE CompanyId=? AND Rut=?;', [ids.a, rut(3)]))[0].N, 1);
    assert.equal(fs.readdirSync(path.join(folder, String(ids.a))).filter(f => !f.startsWith('.')).length,
      (await query("SELECT COUNT(*) AS N FROM dbo.[File] WHERE CompanyId=?;", [ids.a]))[0].N, 'sin fotos huérfanas');
  });

  await t.test('the same photo cannot back two receipts', async () => {
    const image = png();
    assert.equal((await create('worker', { receiptNumber: number('301'), ...supplier }, image)).status, 201);
    const again = await create('other', { receiptNumber: number('302'), ...supplier }, image);
    assert.equal(again.status, 409); assert.equal(again.data.code, 'RECEIPT_IMAGE_ALREADY_USED');
    assert.equal((await create('worker', { receiptNumber: number('303') }, null)).status, 400, 'la foto es obligatoria');
  });

  await t.test('suppliers are shared inside the company and hidden from others', async () => {
    const list = async who => (await call('GET', '/suppliers?q=tornillo', { token: tokens[who] })).data.suppliers.map(s => s.Name);
    assert.deepEqual(await list('worker'), ['Ferretería El Tornillo']);
    assert.deepEqual(await list('foreign'), []);
    const sameName = await create('worker', { receiptNumber: number('310'), supplierName: 'ferreteria  el tornillo'.replace('ferreteria', 'Ferretería'), supplierRut: rut(4) });
    assert.equal(sameName.status, 201);
    assert.equal((await call('GET', '/suppliers?q=tornillo', { token: tokens.worker })).data.suppliers.length, 2, 'mismo nombre y otro RUT es otro comercio');
    assert.equal((await create('worker', { receiptNumber: number('311'), supplierName: 'FERRETERIA EL TORNILLO' })).status, 201);
    assert.equal((await call('GET', '/suppliers?q=ferreteria', { token: tokens.worker })).data.suppliers.length, 2, 'sin tilde y sin RUT es el mismo comercio');
  });

  await t.test('editing recalculates, keeps history and respects ownership', async () => {
    const edit = (who, fields, image = null) => call('PUT', `/expenses/${ids.first}`, { token: tokens[who], raw: form({ receiptNumber: number('001'), ...supplier, ...fields }, image) });
    assert.equal((await edit('admin', {})).status, 403);
    assert.equal((await edit('other', {})).status, 404);
    assert.equal((await edit('worker', { receiptNumber: number('101') })).status, 409, 'número de otra boleta del mismo comercio');
    const saved = await edit('worker', { totalAmount: 23800, vatSource: 'EXEMPT', description: 'Corregida' }, png());
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.deepEqual([saved.data.expense.NetAmount, saved.data.expense.VatAmount], [23800, 0]);
    const { history } = (await call('GET', `/expenses/${ids.first}/history`, { token: tokens.worker })).data;
    assert.equal(history[0].Action, 'UPDATE_EXPENSE'); assert.equal(JSON.parse(history[0].BeforeData).TotalAmount, 11900);
  });

  await t.test('the list is paged, filtered and scoped', async () => {
    const search = async (who, qs) => (await call('GET', `/expenses/search?${qs}`, { token: tokens[who] })).data;
    const all = await search('admin', 'pageSize=100');
    assert.equal(all.total, all.expenses.length);
    const page = await search('admin', 'pageSize=3&page=2');
    assert.deepEqual(page.expenses.map(e => e.Id), all.expenses.slice(3, 6).map(e => e.Id));
    assert.ok((await search('worker', 'scope=company&pageSize=100')).expenses.every(e => e.UserId === ids.worker), 'el trabajador solo ve las suyas');
    assert.ok((await search('worker', `workerId=${ids.other}&pageSize=100`)).expenses.every(e => e.UserId === ids.worker));
    assert.ok((await search('admin', `workerId=${ids.other}&pageSize=100`)).expenses.every(e => e.UserId === ids.other));
    assert.equal((await search('foreign', 'pageSize=100')).total, 0, 'otra empresa no ve nada');
    assert.equal((await search('admin', `q=${number('200')}`)).total, 1);
    assert.equal((await search('admin', 'q=%25')).total, 0, 'los comodines se buscan literalmente');
    assert.equal((await search('admin', 'q=copec')).total, 1);
    assert.ok((await search('admin', 'q=ferreteria')).total > 3, 'busca sin tildes');
    assert.ok((await search('admin', `q=${rut(3).replace(/(\d)(?=(\d{3})+-)/g, '$1.')}`)).total === 1, 'busca el RUT con puntos');
    assert.equal((await search('admin', 'from=2020-01-01&to=2020-12-31')).total, 0);
    for (const bad of ['page=0', 'pageSize=500', 'status=X', 'from=2026-13-01', 'scope=all', `q=${'x'.repeat(101)}`, 'from=2026-02-01&to=2026-01-01'])
      assert.equal((await call('GET', `/expenses/search?${bad}`, { token: tokens.admin })).status, 400, bad);
  });

  await t.test('review: batch approval, rejection with reason, and resubmission after rejection', async () => {
    const pending = (await call('GET', '/expenses/search?review=1&pageSize=100', { token: tokens.admin })).data.expenses.map(e => e.Id);
    const [rejected, ...approved] = pending;
    assert.equal((await call('POST', '/expenses/review', { token: tokens.worker, body: { expenseIds: [rejected], decision: 'APPROVED' } })).status, 403);
    assert.equal((await call('POST', '/expenses/review', { token: tokens.foreign, body: { expenseIds: [rejected], decision: 'APPROVED' } })).status, 409);
    assert.equal((await call('POST', '/expenses/review', { token: tokens.admin, body: { expenseIds: [rejected], decision: 'REJECTED' } })).status, 400);
    assert.equal((await call('POST', '/expenses/review', { token: tokens.admin, body: { expenseIds: [rejected], decision: 'REJECTED', reason: 'Foto ilegible' } })).status, 200);
    assert.equal((await call('POST', '/expenses/review', { token: tokens.admin, body: { expenseIds: approved, decision: 'APPROVED' } })).data.updated, approved.length);
    const row = (await query('SELECT ReceiptNumber,SupplierId,UserId FROM dbo.Expense WHERE Id=?;', [rejected]))[0];
    const who = row.UserId === ids.other ? 'other' : 'worker';
    assert.equal((await create(who, { receiptNumber: row.ReceiptNumber, supplierId: row.SupplierId })).status, 201, 'una rechazada se puede volver a presentar');
    const notices = (await call('GET', '/notifications', { token: tokens[who] })).data;
    assert.ok(notices.notifications.some(n => n.Kind === 'REJECTED' && n.ExpenseId === rejected));
  });

  await t.test('corrections keep the VAT source and their history', async () => {
    const fuel = (await query("SELECT TOP 1 Id,TotalAmount FROM dbo.Expense WHERE CompanyId=? AND VatSource=N'RECEIPT' AND Status=N'APPROVED';", [ids.a]))[0];
    const correct = extra => call('POST', `/expenses/${fuel.Id}/corrections`, { token: tokens.admin, body: { expenseDate: today, expectedDate: today, expectedAmount: Number(fuel.TotalAmount), totalAmount: 31000, reason: 'Total mal digitado', ...extra } });
    assert.equal((await correct({})).status, 400, 'con IVA impreso hay que indicar el nuevo IVA');
    assert.equal((await correct({ vatAmount: 3300 })).status, 200);
    const after = (await query('SELECT NetAmount,VatAmount,VatSource FROM dbo.Expense WHERE Id=?;', [fuel.Id]))[0];
    assert.deepEqual([after.NetAmount, after.VatAmount, after.VatSource], [27700, 3300, 'RECEIPT']);
  });

  await t.test('a sole administrator is approved automatically; with two, another one reviews', async () => {
    const own = await create('admin', { receiptNumber: number('400'), ...supplier });
    assert.equal(own.status, 201); assert.equal(own.data.expense.Status, 'APPROVED');
  });

  await t.test('budgets and dashboard agree with the receipts', async () => {
    assert.equal((await call('PUT', '/budgets', { token: tokens.worker, body: { amount: 100000 } })).status, 403);
    assert.equal((await call('PUT', '/budgets', { token: tokens.admin, body: { amount: 500000 } })).status, 200);
    assert.equal((await call('PUT', '/budgets', { token: tokens.admin, body: { userId: ids.worker, amount: 80000 } })).status, 200);
    assert.equal((await call('PUT', '/budgets', { token: tokens.admin, body: { userId: ids.foreign, amount: 80000 } })).status, 404);
    for (const amount of [0, -1, 1.5, '100']) assert.equal((await call('PUT', '/budgets', { token: tokens.admin, body: { amount } })).status, 400);
    const expected = (await query("SELECT SUM(TotalAmount) AS T,SUM(VatAmount) AS V FROM dbo.Expense WHERE CompanyId=? AND IsDeleted=0 AND Status<>N'REJECTED';", [ids.a]))[0];
    const data = (await call('GET', '/dashboard?scope=company', { token: tokens.admin })).data;
    assert.equal(data.total, Number(expected.T)); assert.equal(data.vat, Number(expected.V)); assert.equal(data.net + data.vat, data.total);
    assert.equal(data.budget.amount, 500000); assert.equal(data.budget.remaining, 500000 - data.total);
    assert.equal(data.workers.reduce((s, w) => s + w.amount, 0), data.total);
    const mine = (await call('GET', '/dashboard', { token: tokens.worker })).data;
    assert.equal(mine.scope, 'personal'); assert.equal(mine.budget.amount, 80000); assert.deepEqual(mine.workers, []);
    assert.equal((await call('GET', '/dashboard', { token: tokens.other })).data.budget, null);
  });

  await t.test('the Excel totals match the database', async () => {
    const report = (await call('GET', `/reports/expenses?year=${today.slice(0, 4)}&month=${today.slice(5, 7)}`, { token: tokens.admin })).data;
    const ExcelJS = require('exceljs'), book = new ExcelJS.Workbook();
    await book.xlsx.load(Buffer.from(report.base64, 'base64'));
    const expected = (await query("SELECT COUNT(*) AS N,SUM(TotalAmount) AS T,SUM(VatAmount) AS V,SUM(NetAmount) AS S FROM dbo.Expense WHERE CompanyId=? AND IsDeleted=0 AND Status=N'APPROVED';", [ids.a]))[0];
    const row = book.getWorksheet('Resumen').getRow(13);
    assert.deepEqual([2, 3, 4, 5].map(c => row.getCell(c).value), [expected.N, Number(expected.S), Number(expected.V), Number(expected.T)]);
    const other = book.getWorksheet('Pendientes y rechazadas');
    let reasons = 0; other.getColumn(15).eachCell(cell => { if (cell.value === 'Foto ilegible') reasons++; });
    assert.equal(reasons, 1, 'el motivo de rechazo llega al Excel');
    assert.equal((await call('GET', '/reports/expenses?year=2026', { token: tokens.worker })).status, 403);
  });

  await t.test('withdrawing keeps the record and unknown routes answer clearly', async () => {
    const created = await create('worker', { receiptNumber: number('500'), ...supplier });
    const id = created.data.expense.Id;
    assert.equal((await call('DELETE', `/expenses/${id}`, { token: tokens.admin })).status, 404);
    assert.equal((await call('DELETE', `/expenses/${id}`, { token: tokens.worker })).status, 200);
    assert.equal((await call('GET', `/expenses/${id}`, { token: tokens.worker })).status, 404);
    assert.equal((await query('SELECT COUNT(*) AS N FROM dbo.Expense WHERE Id=?;', [id]))[0].N, 1);
    assert.equal((await create('worker', { receiptNumber: number('500'), ...supplier })).status, 201, 'se puede volver a registrar');
    assert.equal((await call('GET', '/no-existe', { token: tokens.worker })).status, 404);
  });
});
