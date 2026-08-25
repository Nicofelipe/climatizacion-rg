import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

interface AuthTokenPayload {
  userId: number;
  companyId: number;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function authenticateToken(
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
      secret
    ) as AuthTokenPayload;

    req.user = payload;

    next();
  } catch {
    res.status(401).json({
      message: 'Invalid or expired token',
    });
  }
}