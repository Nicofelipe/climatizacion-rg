import {AsyncLocalStorage} from 'node:async_hooks';
import type {RequestHandler} from 'express';

export const requestTiming=new AsyncLocalStorage<{id:number}>();
export const performanceDiagnostics=process.env.PERF_DIAGNOSTICS==='1';
let sequence=0;
// Opt-in local diagnostics: never log URLs, query strings, headers, bodies or identity.
export const measureRequests:RequestHandler=(req,res,next)=>{
 if(!performanceDiagnostics){next();return;}
 const id=++sequence,start=Date.now();
 const group=['auth','expenses','dashboard','users','notifications','health','storage'].includes(req.path.split('/')[2]??'')?req.path.split('/')[2]:'other';
 const method=['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'].includes(req.method)?req.method:'other';
 const log=(state:string)=>console.log('[perf]',JSON.stringify({id,group,method,state,ms:Date.now()-start,status:res.statusCode,at:new Date().toISOString()}));
 log('start');
 const timer=setTimeout(()=>log('waiting'),5000);timer.unref();
 let finished=false;
 res.once('finish',()=>{finished=true;clearTimeout(timer);log('finished');});
 res.once('close',()=>{clearTimeout(timer);if(!finished)log('disconnected');});
 requestTiming.run({id},next);
};
