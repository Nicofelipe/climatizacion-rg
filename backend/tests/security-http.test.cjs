require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const express=require('express'),cors=require('cors');
const {fixedWindowLimit,allowedWebOrigin,privateResponses,safeRequestError}=require('../src/middlewares/security.middleware.ts');
const {uploadReceiptImage,validateReceiptImage}=require('../src/middlewares/upload.middleware.ts');
const fs=require('node:fs/promises');
test('HTTP protections reject forged files, untrusted origins, oversized and malformed requests without leaking stack traces',async()=>{
 const app=express();app.use(privateResponses,allowedWebOrigin,cors({origin:true}),express.json({limit:'32kb'}));
 let accepted=0;app.post('/upload',uploadReceiptImage.single('image'),validateReceiptImage,async(req,res)=>{accepted++;if(req.file)await fs.unlink(req.file.path);res.json({ok:true});});
 app.post('/json',(_req,res)=>res.json({ok:true}));
 app.get('/private',(_req,res)=>res.status(401).json({message:'Authentication required'}));
 app.use(safeRequestError);
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  let response=await fetch(base+'/private',{headers:{Origin:'https://untrusted.example'}});assert.equal(response.status,403);assert.equal(response.headers.get('access-control-allow-origin'),null);
  response=await fetch(base+'/private',{headers:{Origin:'https://climatizacion-rg-pruebas.onrender.com'}});assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store');
  response=await fetch(base+'/private');assert.equal(response.status,401);
  response=await fetch(base+'/json',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'});assert.equal(response.status,400);assert.equal((await response.text()).includes('SyntaxError'),false);
  response=await fetch(base+'/json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:'x'.repeat(33000)})});assert.equal(response.status,413);
  for(const [mime,data,status]of [['image/jpeg','<html>not a photograph</html>',415],['image/svg+xml','<svg onload="alert(1)"/>',415],['image/png',Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]),200]]){
   const form=new FormData();form.append('image',new Blob([data],{type:mime}),'untrusted.html');
   response=await fetch(base+'/upload',{method:'POST',body:form});assert.equal(response.status,status);
  }
  assert.equal(accepted,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('rate limiter scopes, bounds and expires attempts and ignores forged forwarding headers',()=>{
 let time=0,accepted=0;const limit=fixedWindowLimit(2,1000,req=>req.ip,()=>time);
 const response=()=>({setHeader(name,value){this[name]=value;},status(code){this.code=code;return this;},json(){}});
 const req={ip:'127.0.0.1',headers:{'x-forwarded-for':'different-every-time'}};
 limit(req,response(),()=>accepted++);limit(req,response(),()=>accepted++);
 const blocked=response();limit(req,blocked,()=>accepted++);assert.equal(blocked.code,429);assert.equal(accepted,2);assert.equal(blocked['Retry-After'],'1');
 limit({...req,ip:'127.0.0.2'},response(),()=>accepted++);assert.equal(accepted,3);
 time=1000;limit(req,response(),()=>accepted++);assert.equal(accepted,4);
});
