import { NextFunction, Response } from 'express';

import { AuthenticatedRequest } from './auth.middleware';

export function requireRole(...allowedRoles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const role = req.user?.role;

    if (!role) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(403).json({
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
}