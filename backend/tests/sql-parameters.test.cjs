require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {namedParameters}=require('../src/database/sqlServer.ts');
test('placeholders become named parameters outside literals, identifiers and comments',()=>{
 assert.deepEqual(namedParameters("SELECT ? AS a, N'¿Qué?' AS b, [x?] FROM t WHERE c=? -- ¿y?\nAND d=? /* e? */ AND f='it''s?'"),
  {sql:"SELECT @p0 AS a, N'¿Qué?' AS b, [x?] FROM t WHERE c=@p1 -- ¿y?\nAND d=@p2 /* e? */ AND f='it''s?'",count:3});
 assert.deepEqual(namedParameters('DECLARE @A int=?,@B int=?;'),{sql:'DECLARE @A int=@p0,@B int=@p1;',count:2});
});
test('every application query has as many placeholders as the code passes, counted the same way',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const files=fs.readdirSync(path.join(__dirname,'../src'),{recursive:true}).filter(f=>f.endsWith('.ts')).map(f=>path.join(__dirname,'../src',f));
 let checked=0;
 for(const file of files){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/executeQuery<[^>]*>\(\s*`([^`]*)`/g)){if(m[1].includes('${'))continue;namedParameters(m[1]);checked++;}}
 assert.ok(checked>20,`${checked} consultas revisadas`);
});
