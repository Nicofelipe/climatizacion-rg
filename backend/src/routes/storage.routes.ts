import { Router } from 'express';

import {
    getStorageController,
    updateGoogleDriveStorageController,
} from '../controllers/storage.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

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

export default router;