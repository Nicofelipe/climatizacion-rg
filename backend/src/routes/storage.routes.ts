import { Router } from 'express';

import {
    connectGoogleDriveController,
    getStorageController,
    googleDriveCallbackController,
    testGoogleDriveController,
    updateGoogleDriveStorageController
} from '../controllers/storage.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

router.get(
  '/google-drive/test',
  authenticateToken,
  requireRole('ADMIN'),
  testGoogleDriveController
);

router.get(
    '/',
    authenticateToken,
    requireRole('ADMIN'),
    getStorageController
);

router.put(
    '/google-drive',
    authenticateToken,
    requireRole('ADMIN'),
    updateGoogleDriveStorageController
);

router.get(
  '/google-drive/connect',
  authenticateToken,
  requireRole('ADMIN'),
  connectGoogleDriveController
);

router.get(
  '/google-drive/callback',
  googleDriveCallbackController
);

export default router;