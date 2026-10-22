import { Router } from 'express';

import { loginController } from '../controllers/auth.controller';
import googleLoginRoutes from './googleLogin.routes';
import passwordRoutes from './password.routes';
import passwordRecoveryRoutes from './passwordRecovery.routes';
import {
    AuthenticatedRequest,
    authenticateToken,
} from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
router.use(passwordRecoveryRoutes);
router.use(passwordRoutes);
router.use('/google',googleLoginRoutes);

router.post('/login', loginController);

router.get(
  '/me',
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      message: 'Authenticated user',
      user: req.user,
    });
  }
);

router.get(
  '/admin-test',
  authenticateToken,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      message: 'Admin access granted',
      user: req.user,
    });
  }
);

export default router;
