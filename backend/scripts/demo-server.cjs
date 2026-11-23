/**
 * Servidor de demostración: API y web en http://localhost:3100, con una base desechable y datos ficticios.
 *   npm run demo            (requiere haber ejecutado antes "npm run build:web" en mobile)
 * Nunca usa la base real: el nombre debe terminar en _Test. Las fotos van a una carpeta temporal.
 */
require('dotenv').config({ quiet: true });
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { execFileSync } = require('node:child_process');
const database = process.env.TEST_DATABASE ?? 'ClepitBoletas_Test';
if (!/^\w+_Test$/.test(database)) throw new Error('TEST_DATABASE debe terminar en _Test.');
const port = Number(process.env.DEMO_PORT ?? 3100);
Object.assign(process.env, {
  DB_DATABASE: database, PORT: String(port), HOST: '127.0.0.1', RECEIPT_STORAGE: 'local', RECEIPT_STORAGE_DIR: path.join(os.tmpdir(), 'clepit-boletas-demo'),
  JWT_SECRET: 'solo-para-la-demostracion-local-0000000000', CORS_ALLOWED_ORIGINS: `http://localhost:${port},http://127.0.0.1:${port},http://localhost:8081`,
  WEB_DIR: path.resolve(__dirname, '../../mobile/dist'), FCM_PROJECT_ID: '', FCM_SERVICE_ACCOUNT_FILE: '', SMTP_HOST: '',
});
execFileSync(process.execPath, [require.resolve('tsx/cli'), path.resolve(__dirname, '../src/database/migrate.ts'), '--create'], { stdio: 'inherit', env: process.env });
require('tsx/cjs');
const { executeQuery } = require('../src/database/sqlServer.ts');
const bcrypt = require('bcryptjs');

// Cuentas ficticias, solo para esta base.
const PASSWORD = 'DemoClepit2026';
const COMPANY = 'Climatización Demo SpA';
const people = [['Camila', 'Rojas', 'admin@demo.test', 'ADMIN'], ['Diego', 'Fuentes', 'diego@demo.test', 'EMPLOYEE'], ['Antonia', 'Soto', 'antonia@demo.test', 'EMPLOYEE']];
const suppliers = [['Ferretería El Tornillo SpA', '76086428-5'], ['Copec Vespucio', '99520000-7'], ['Restaurante La Esquina', '77123456-K'], ['Estacionamientos Centro', null], ['Distribuidora Clima Sur Ltda.', '76543210-3']];

async function seed() {
  if ((await executeQuery('SELECT Id FROM dbo.Company WHERE Name=?;', [COMPANY])).length) return;
  const { createExpense, finishExpenseSync } = require('../src/services/expense.service.ts');
  const { createExpenseFile } = require('../src/services/file.service.ts');
  const { resolveSupplier } = require('../src/services/supplier.service.ts');
  const { setBudget } = require('../src/services/budget.service.ts');
  const [company] = await executeQuery('INSERT INTO dbo.Company(Name,Rut) OUTPUT INSERTED.Id VALUES(?,?);', [COMPANY, 'DEMO-1']);
  const hash = await bcrypt.hash(PASSWORD, 10), ids = [];
  for (const [first, last, email, role] of people) ids.push((await executeQuery(`INSERT INTO dbo.AppUser(CompanyId,RoleId,FirstName,LastName,Email,PasswordHash)
    OUTPUT INSERTED.Id SELECT ?,Id,?,?,?,? FROM dbo.Role WHERE Name=?;`, [company.Id, first, last, email, hash, role]))[0].Id);
  const shops = [];
  for (const [supplierName, supplierRut] of suppliers) shops.push(await resolveSupplier(company.Id, { supplierName, supplierRut }));
  const folder = path.join(process.env.RECEIPT_STORAGE_DIR, String(company.Id));
  fs.mkdirSync(folder, { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, '../assets/clepit-logo.png'), path.join(folder, 'demo.png'));
  const types = [[3, 0, 'CALCULATED'], [2, 1, 'RECEIPT'], [1, 2, 'CALCULATED'], [6, 3, 'CALCULATED'], [4, 4, 'CALCULATED'], [5, 0, 'EXEMPT']];
  const today = new Date();
  for (let index = 0; index < 62; index++) {
    const date = new Date(today.getTime() - index * 2.6 * 86400000).toISOString().slice(0, 10);
    const [expenseTypeId, shop, vatSource] = types[(index * 5 + (index >> 2)) % types.length];
    const totalAmount = 2500 + (index * 7919) % 68000;
    const expense = await createExpense({ companyId: company.Id, userId: ids[1 + index % 2], expenseTypeId, supplierId: shops[shop], receiptNumber: String(40210 + index * 37), expenseDate: date, totalAmount,
      vatSource, vatAmount: vatSource === 'RECEIPT' ? Math.round(totalAmount * 0.11) : null, description: index % 4 ? null : 'Obra edificio Las Lilas' });
    await createExpenseFile({ companyId: company.Id, expenseId: expense.Id, provider: 'LOCAL', providerFileId: 'demo.png', originalFileName: 'demo.png', mimeType: 'image/png', fileSize: 1000 });
    await finishExpenseSync(company.Id, expense.Id);
    if (index >= 7) await executeQuery(`UPDATE dbo.Expense SET Status=?,RejectionReason=?,ReviewedByUserId=?,ReviewedAt=SYSUTCDATETIME() WHERE Id=?;`,
      [index % 11 === 0 ? 'REJECTED' : 'APPROVED', index % 11 === 0 ? 'La foto no permite leer el total.' : null, ids[0], expense.Id]);
  }
  await setBudget({ companyId: company.Id, actorId: ids[0], userId: null, amount: 900000 });
  await setBudget({ companyId: company.Id, actorId: ids[0], userId: ids[1], amount: 350000 });
}

seed().then(() => {
  console.log(`Demostración: http://localhost:${port}  ·  ${people.map(person => person[2]).join(', ')}  ·  clave ${PASSWORD}`);
  require('../src/server.ts');
}).catch(error => { console.error(error); process.exit(1); });
