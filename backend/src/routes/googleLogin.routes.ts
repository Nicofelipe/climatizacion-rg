import { Router } from 'express';
import { completeGoogleLogin, exchangeGoogleTicket, startGoogleLogin } from '../services/googleLogin.service';
const router=Router();
router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');next();});
router.post('/start',(req,res)=>{
  const {redirectUri,challenge}=req.body??{};
  if(typeof redirectUri!=='string'||typeof challenge!=='string'){res.sendStatus(400);return;}
  try{res.json({authorizationUrl:startGoogleLogin(redirectUri,challenge)});}catch{res.status(400).json({message:'No fue posible iniciar Google. Revisa la configuración de la dirección de retorno.'});}
});
router.get('/callback',async(req,res)=>{
  if(typeof req.query.state!=='string'){res.status(400).send('Intento de acceso no válido. Vuelve a la aplicación.');return;}
  try{res.redirect(await completeGoogleLogin(req.query.state,typeof req.query.code==='string'?req.query.code:undefined));}
  catch{res.status(400).send('El intento de acceso venció. Vuelve a la aplicación e inténtalo nuevamente.');}
});
router.post('/exchange',async(req,res)=>{
  const {ticket,verifier}=req.body??{};
  if(typeof ticket!=='string'||!/^[a-f0-9]{64}$/.test(ticket)||typeof verifier!=='string'||!/^[a-f0-9]{64}$/.test(verifier)){res.sendStatus(400);return;}
  try{res.json(await exchangeGoogleTicket(ticket,verifier));}
  catch(error){const message=error instanceof Error?error.message:'';res.status(401).json({message:message==='GOOGLE_EMAIL_REQUIRES_LINK'?'Para el primer acceso usa Gmail o Google Workspace. Con otros proveedores, ingresa con tu contraseña registrada.':'No fue posible ingresar. Usa el correo activo registrado por tu empresa o vuelve a intentar si el acceso venció.'});}
});
export default router;
