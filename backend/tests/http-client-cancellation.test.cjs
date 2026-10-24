require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {requestJson}=require('../../mobile/src/api/http.ts');
test('leaving a screen cancels its network request; read timeouts do not suggest duplicate submissions',async()=>{
 const original=global.fetch;let stopped=false;
 global.fetch=async(_url,{signal})=>new Promise((_resolve,reject)=>{
  const stop=()=>{stopped=true;reject(new Error('Aborted'));};
  if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});
 });
 try{
  const controller=new AbortController();const result=requestJson('https://example.invalid',{signal:controller.signal});
  controller.abort();await assert.rejects(result,/consulta tardó/);assert.equal(stopped,true);
  await assert.rejects(requestJson('https://example.invalid',{},5),/consulta tardó/);
  await assert.rejects(requestJson('https://example.invalid',{method:'POST'},5),/evitar duplicados/);
 }finally{global.fetch=original;}
});
test('Android DNS errors produce a useful Spanish message without native stack details',async()=>{
 const original=global.fetch;
 global.fetch=async()=>{throw new Error('Fetch failed: java.net.UnknownHostException: Unable to resolve host');};
 try{await assert.rejects(requestJson('https://example.invalid'),error=>error.message.startsWith('No fue posible conectar')&&!error.message.includes('java.net'));}
 finally{global.fetch=original;}
});
