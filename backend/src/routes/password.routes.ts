import { Router } from 'express';
import { AuthenticatedRequest,authenticateToken } from '../middlewares/auth.middleware';
import { changePassword,getPasswordAccount,passwordPolicy } from '../services/passwordPolicy.service';
import { passwordRequirementsMessage } from '../utils/passwordRequirements';
const router=Router();
router.get('/password/status',authenticateToken,async(req:AuthenticatedRequest,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{const account=await getPasswordAccount(req.user!.companyId,req.user!.userId);if(!account){res.sendStatus(401);return;}res.json(passwordPolicy(account));}
  catch{res.status(503).json({message:'No fue posible consultar el plazo de tu contraseña.'});}
});
router.post('/password/change',authenticateToken,async(req:AuthenticatedRequest,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{const result=await changePassword(req.user!.companyId,req.user!.userId,req.body?.currentPassword,req.body?.newPassword);res.json({...result,message:'Contraseña actualizada. Las sesiones anteriores se cerraron.'});}
  catch(error){const message=error instanceof Error?error.message:'';
    const errors:Record<string,string>={PASSWORD_FORMAT:passwordRequirementsMessage,CURRENT_PASSWORD_INVALID:'La contraseña actual no es correcta.',PASSWORD_UNCHANGED:'La nueva contraseña debe ser distinta de la actual.',PASSWORD_RATE_LIMIT:'Demasiados intentos. Espera 10 minutos antes de volver a intentarlo.'};
    res.status(message==='PASSWORD_RATE_LIMIT'?429:400).json({message:errors[message]??'No fue posible actualizar la contraseña. Vuelve a iniciar sesión e inténtalo nuevamente.'});
  }
});
export default router;
