require('tsx/cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
const {validNewPassword:server}=require('../src/utils/passwordRequirements.ts');
const {validNewPassword:mobile}=require('../../mobile/src/utils/passwordRequirements.ts');
test('creation and replacement use the same minimum complexity',()=>{
 for(const [password,expected] of [['Clave123',true],['Clave123!',true],['Clave12',false],['clave123',false],['CLAVE123',false],['Claveabc',false],['12345678',false],['A1'+'a'.repeat(71),false]]){
   assert.equal(server(password),expected);assert.equal(mobile(password),expected);
 }
 assert.equal(server('Á'.repeat(36)+'Aa1'),false);
 assert.equal(mobile('Á'.repeat(36)+'Aa1'),false);
});
