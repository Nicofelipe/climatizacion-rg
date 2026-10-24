import {Router} from 'express';
import {authenticateToken,AuthenticatedRequest} from '../middlewares/auth.middleware';
import {fixedWindowLimit} from '../middlewares/security.middleware';
import {listNotifications,readNotification,registerPushDevice,unregisterPushDevice} from '../services/notification.service';
import {notificationMessage} from '../services/notificationMessage';
import {pushConfigured} from '../services/pushDelivery.service';
const router=Router();router.use(authenticateToken);
router.get('/',async(req:AuthenticatedRequest,res)=>{
 try{const user=req.user!;const rows=await listNotifications(user.companyId,user.userId,user.role==='ADMIN');res.json({notifications:rows.map(row=>({...row,...notificationMessage(row.Kind)})),unreadCount:rows[0]?.UnreadCount??0,pushAvailable:pushConfigured()});}
 catch{res.status(503).json({message:'No fue posible cargar los avisos.'});}
});
router.post('/:id/read',async(req:AuthenticatedRequest,res)=>{
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<=0){res.sendStatus(400);return;}
 try{const user=req.user!;const rows=await readNotification(user.companyId,user.userId,id,user.role==='ADMIN');if(!rows[0]){res.sendStatus(404);return;}res.json({notification:rows[0]});}
 catch{res.status(503).json({message:'No fue posible abrir el aviso.'});}
});
const deviceLimit=fixedWindowLimit(30,900000,req=>{const user=(req as AuthenticatedRequest).user!;return `${user.companyId}:${user.userId}`;});
router.post('/devices/register',deviceLimit,async(req:AuthenticatedRequest,res)=>{
 const {token,registrationId}=req.body??{};if(typeof token!=='string'||token.length<20||token.length>4096||/\s/.test(token)||typeof registrationId!=='string'||!/^[a-f0-9-]{36}$/i.test(registrationId)){res.sendStatus(400);return;}
 try{const user=req.user!;await registerPushDevice(user.companyId,user.userId,token,user.passwordVersion??0,registrationId);res.json({registered:true,pushAvailable:pushConfigured()});}
 catch{res.status(503).json({message:'No fue posible activar los avisos del teléfono.'});}
});
router.post('/devices/unregister',deviceLimit,async(req:AuthenticatedRequest,res)=>{
 const {token,registrationId}=req.body??{};if(typeof token!=='string'||token.length>4096||typeof registrationId!=='string'||registrationId.length!==36){res.sendStatus(400);return;}
 try{const user=req.user!;await unregisterPushDevice(user.companyId,user.userId,token,registrationId);res.json({registered:false});}
 catch{res.status(503).json({message:'No fue posible desactivar los avisos.'});}
});
export default router;
