import { Router } from 'express';
import { requestPasswordRecovery,resetPassword,recoveryResponse,resetTokenHash } from '../services/passwordRecovery.service';
import { recoveryMailConfigured } from '../services/recoveryMail.service';
import { passwordRequirementsMessage } from '../utils/passwordRequirements';
const router=Router(),limits=new Map<string,{count:number;until:number}>();
function allow(key:string,max:number){const now=Date.now();for(const [key,value]of limits)if(value.until<now)limits.delete(key);if(limits.size>=10000&&!limits.has(key))return false;const value=limits.get(key)??{count:0,until:now+900000};value.count++;limits.set(key,value);return value.count<=max;}
router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');next();});
router.get('/recovery/status',(_req,res)=>{res.json({available:recoveryMailConfigured()});});
router.post('/recovery/request',(req,res)=>{
  const email=req.body?.email;
  if(typeof email!=='string'||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email.trim())){res.status(400).json({message:'Ingresa un correo válido.'});return;}
  if(!recoveryMailConfigured()){res.status(503).json({message:'El envío de recuperación aún no está configurado. Contacta al responsable técnico.'});return;}
  const normalized=email.trim().toLowerCase();
  if(!allow(`request-ip:${req.ip}`,10)||!allow(`email:${resetTokenHash(normalized)}`,3)){res.status(429).json({message:'Espera 15 minutos antes de solicitar otro enlace.'});return;}
  // Same immediate response for registered and unknown mailboxes.
  res.status(202).json({message:recoveryResponse});
  void requestPasswordRecovery(normalized).catch(()=>console.warn('Password recovery email delivery failed.'));
});
router.post('/recovery/reset',async(req,res)=>{
  if(!allow(`reset-ip:${req.ip}`,10)){res.status(429).json({message:'Demasiados intentos. Espera 15 minutos.'});return;}
  const {token,password}=req.body??{};
  if(typeof token!=='string'||typeof password!=='string'){res.status(400).json({message:'Enlace no válido o contraseña incompleta.'});return;}
  try{await resetPassword(token,password);res.json({message:'Contraseña actualizada. Ingresa con tu nueva contraseña.'});}
  catch(error){const message=error instanceof Error?error.message:'';res.status(400).json({message:message==='PASSWORD_FORMAT'?passwordRequirementsMessage:'El enlace no es válido, ya fue utilizado o venció. Solicita uno nuevo.'});}
});
export default router;
