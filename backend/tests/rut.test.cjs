require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
const {normalizeRut}=require('../src/utils/rut.ts');
test('RUT confirmation normalizes formatting and verifies check digit without coercing inputs',()=>{
 for(const value of ['12.345.678-5','123456785',' 12 345 678-5 '])assert.equal(normalizeRut(value),'12345678-5');
 for(const value of ['12345678-9','12.345.678-55','00000000-0','12345-5',{},null,123456785,'RUT:12345678-5'])assert.equal(normalizeRut(value),null);
});
