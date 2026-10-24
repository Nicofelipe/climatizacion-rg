import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getPasswordAccount,passwordPolicy } from '../services/passwordPolicy.service';

interface AuthTokenPayload {
  passwordVersion?:number;
  userId: number;
  companyId: number;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({
      message: 'Authentication required',
    });
    return;
  }

  const token = authorization.substring(7);

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const payload = jwt.verify(
      token,
      secret,
      { algorithms:['HS256'] }
    ) as AuthTokenPayload;

    if (!payload || !Number.isInteger(payload.userId) || payload.userId <= 0 ||
        !Number.isInteger(payload.companyId) || payload.companyId <= 0 ||
        !['ADMIN', 'EMPLOYEE'].includes(payload.role)) {
      res.status(401).json({ message: 'Invalid session token' });
      return;
    }

    req.user = payload;
    let account;
    try{account=await getPasswordAccount(payload.companyId,payload.userId);}
    catch{res.status(503).json({message:'No fue posible verificar la sesión. Inténtalo nuevamente.'});return;}
    if(!account||account.RoleName!==payload.role||account.PasswordVersion!==(payload.passwordVersion??0)){
      res.status(401).json({message:'La sesión ya no es válida. Vuelve a iniciar sesión.'});return;
    }
    const policy=passwordPolicy(account);
    if(policy.expired&&!['/password/status','/password/change'].includes(req.path)){
      res.status(403).json({code:'PASSWORD_CHANGE_REQUIRED',message:'Venció el plazo de la contraseña inicial. Cambia tu contraseña para continuar.'});return;
    }
    next();
  } catch {
    res.status(401).json({
      message: 'Invalid or expired token',
    });
  }
}
