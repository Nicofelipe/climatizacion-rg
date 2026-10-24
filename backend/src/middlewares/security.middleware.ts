import { createHash } from 'node:crypto';
import { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';

export function fixedWindowLimit(max:number,windowMs:number,key:(req:Parameters<RequestHandler>[0])=>string,now=Date.now):RequestHandler {
  const entries=new Map<string,{count:number;until:number}>();
  return (req,res,next)=>{
    const time=now();
    for(const [id,value] of entries)if(value.until<=time)entries.delete(id);
    const id=key(req);
    const entry=entries.get(id)??{count:0,until:time+windowMs};
    if((!entries.has(id)&&entries.size>=10000)||entry.count>=max){
      res.setHeader('Retry-After',String(Math.max(1,Math.ceil((entry.until-time)/1000))));
      res.status(429).json({message:'Demasiados intentos. Espera unos minutos antes de volver a intentar.'});return;
    }
    entry.count++;entries.set(id,entry);next();
  };
}
// Do not trust caller-supplied X-Forwarded-For headers. Behind the current tunnel,
// the network limit is shared; account limits remain separate and fail closed.
export const loginNetworkLimit=fixedWindowLimit(100,900000,req=>req.ip??'unknown');
export const loginAccountLimit=fixedWindowLimit(10,900000,req=>createHash('sha256').update(
  typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'invalid-input').digest('hex'));
export const googleAttemptLimit=fixedWindowLimit(100,900000,req=>req.ip??'unknown');
export const privateResponses:RequestHandler=(_req,res,next)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');next();
};
export const allowedWebOrigin:RequestHandler=(req,res,next)=>{
  const origin=req.headers.origin;
  const allowed=(process.env.CORS_ALLOWED_ORIGINS??'http://localhost:8081,https://climatizacion-rg-pruebas.onrender.com').split(',').map(value=>value.trim());
  if(origin&&!allowed.includes(origin)){res.status(403).json({message:'Origen web no permitido.'});return;}
  next();
};
export const safeRequestError:ErrorRequestHandler=(error,_req,res,_next)=>{
  if(res.headersSent){res.end();return;}
  if(error instanceof multer.MulterError){res.status(error.code==='LIMIT_FILE_SIZE'?413:400).json({message:error.code==='LIMIT_FILE_SIZE'?'La imagen supera el máximo de 10 MB.':'El formulario o sus archivos superan los límites permitidos.'});return;}
  if(error?.type==='entity.too.large'){res.status(413).json({message:'La solicitud supera el tamaño permitido.'});return;}
  if(error instanceof SyntaxError&&'body' in error){res.status(400).json({message:'El contenido de la solicitud no es válido.'});return;}
  if(error?.message==='UNSUPPORTED_RECEIPT_IMAGE'){res.status(415).json({message:'Adjunta una foto JPG, PNG, WEBP, GIF, HEIC o HEIF válida.'});return;}
  console.error('Unhandled request error');
  res.status(500).json({message:'No fue posible procesar la solicitud.'});
};
