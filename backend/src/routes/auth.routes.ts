import { Router } from 'express';

import { loginController } from '../controllers/auth.controller';
import {
    AuthenticatedRequest,
    authenticateToken,
} from '../middlewares/auth.middleware';

const router = Router();

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

export default router;