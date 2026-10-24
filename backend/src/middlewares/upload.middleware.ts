import multer from 'multer';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { open,unlink } from 'node:fs/promises';
import { RequestHandler } from 'express';
import { receiptImageMime } from '../utils/receiptImageFormat';
const imageExtensions:Record<string,string>={'image/jpeg':'.jpg','image/jpg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/heic':'.heic','image/heif':'.heif'};
const temporaryDirectory=path.resolve('uploads');
mkdirSync(temporaryDirectory,{recursive:true});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, temporaryDirectory);
  },

  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${imageExtensions[file.mimetype.toLowerCase()]}`);
  },
});

export const uploadReceiptImage = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files:1,fields:16,fieldSize:8192,parts:17,
  },
  fileFilter: (_req, file, cb) => {
    if (!imageExtensions[file.mimetype.toLowerCase()]) {
      cb(new Error('UNSUPPORTED_RECEIPT_IMAGE'));
      return;
    }

    cb(null, true);
  },
});

export const validateReceiptImage:RequestHandler=async(req,res,next)=>{
  if(!req.file){next();return;}
  try{
    const file=await open(req.file.path,'r');
    let actual:string|null;
    try{const header=Buffer.alloc(64);const {bytesRead}=await file.read(header,0,64,0);actual=receiptImageMime(header.subarray(0,bytesRead));}
    finally{await file.close();}
    const declared=req.file.mimetype.toLowerCase().replace('image/jpg','image/jpeg');
    if(!actual||actual!==declared){await unlink(req.file.path);res.status(415).json({message:'El contenido del archivo no corresponde a una foto válida del formato indicado.'});return;}
    req.file.mimetype=actual;next();
  }catch{
    await unlink(req.file.path).catch(()=>{});
    res.status(400).json({message:'No fue posible validar la foto adjunta.'});
  }
};
