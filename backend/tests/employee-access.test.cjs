require('tsx/cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
let created;
const filename = require.resolve('../src/services/user.service.ts');
require.cache[filename] = { id: filename, filename, loaded: true, exports: {
  createEmployee: async input => { created = input; return { Id: 1 }; },
} };
const { createEmployeeController } = require('../src/controllers/user.controller.ts');
const policyFile=require.resolve('../src/services/passwordPolicy.service.ts');
require.cache[policyFile]={id:policyFile,filename:policyFile,loaded:true,exports:{getPasswordAccount:async(companyId,userId)=>userId===9?null:({RoleName:userId===1?'ADMIN':'EMPLOYEE',PasswordVersion:0}),passwordPolicy:()=>({expired:false})}};
const { authenticateToken } = require('../src/middlewares/auth.middleware.ts');
const valid = { firstName: 'Ana', lastName: 'Prueba', email: 'ana@example.test', password: 'SamplePassword123' };
function response() {
  return { statusCode: 0, status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; } };
}
test('employee account creation authorization and validation', async t => {
  for (const [name, user, body, expected] of [
    ['requires session', undefined, valid, 401],
    ['employee cannot create accounts', { role: 'EMPLOYEE', companyId: 4 }, valid, 403],
    ['rejects invalid email', { role: 'ADMIN', companyId: 4 }, { ...valid, email: 'invalid' }, 400],
    ['rejects short password', { role: 'ADMIN', companyId: 4 }, { ...valid, password: 'short' }, 400],
    ['rejects oversized bcrypt password', { role: 'ADMIN', companyId: 4 }, { ...valid, password: 'a'.repeat(73) }, 400],
    ['rejects malformed phone', { role: 'ADMIN', companyId: 4 }, { ...valid, phone: {} }, 400],
  ]) {
    await t.test(name, async () => {
      created = undefined;
      const res = response();
      await createEmployeeController({ user, body }, res);
      assert.equal(res.statusCode, expected);
      assert.equal(created, undefined);
    });
  }
  await t.test('administrator selects allowed role but cannot select another company', async () => {
    const res = response();
    await createEmployeeController({ user: { role: 'ADMIN', companyId: 4 },
      body: { ...valid, companyId: 99, role: 'ADMIN' } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(created.companyId, 4);
    assert.equal(created.role, 'ADMIN');
    assert.equal(res.body.employee.PasswordHash, undefined);
  });
  await t.test('role defaults to employee',async()=>{const res=response();await createEmployeeController({user:{role:'ADMIN',companyId:4},body:valid},res);assert.equal(res.statusCode,201);assert.equal(created.role,'EMPLOYEE');});
  await t.test('unknown role is rejected',async()=>{const res=response();await createEmployeeController({user:{role:'ADMIN',companyId:4},body:{...valid,role:'OWNER'}},res);assert.equal(res.statusCode,400);});
});

test('session middleware rejects OAuth state and malformed identity claims', async () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'isolated-test-secret-only';
  try {
    for (const [payload, allowed] of [
      [{ userId: 1, companyId: 4, role: 'ADMIN' }, true],
      [{ userId: 2, companyId: 4, role: 'EMPLOYEE' }, true],
      [{ userId: 9, companyId: 4, role: 'EMPLOYEE' }, false],
      [{ userId: 1, companyId: 4, purpose: 'GOOGLE_DRIVE_OAUTH' }, false],
      [{ userId: 1, companyId: 4, role: 'SUPERUSER' }, false],
      [{ userId: 1, companyId: -1, role: 'ADMIN' }, false],
      [{ userId: '1', companyId: 4, role: 'ADMIN' }, false],
    ]) {
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1m' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = response();
      let nextCalled = false;
      await authenticateToken(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, allowed);
      if (!allowed) assert.equal(res.statusCode, 401);
    }
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});
