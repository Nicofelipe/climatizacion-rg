import { Router } from 'express';

import { createEmployeeController } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { listEmployeesController, updateEmployeeController } from '../controllers/employeeManagement.controller';

const router = Router();
router.get('/',authenticateToken,requireRole('ADMIN'),listEmployeesController);
router.put('/:id',authenticateToken,requireRole('ADMIN'),updateEmployeeController);

router.post(
    '/',
    authenticateToken,
    requireRole('ADMIN'),
    createEmployeeController
);

export default router;
