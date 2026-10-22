import { Router } from 'express';

import { createEmployeeController } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { listEmployeesController, updateEmployeeController } from '../controllers/employeeManagement.controller';
import { getApprovalPolicy } from '../services/approvalPolicy.service';

const router = Router();
router.get('/approval-policy',authenticateToken,requireRole('ADMIN'),async(req,res)=>{
  const user=(req as import('../middlewares/auth.middleware').AuthenticatedRequest).user!;
  try{res.setHeader('Cache-Control','no-store');res.json(await getApprovalPolicy(user.companyId));}
  catch{res.status(503).json({message:'No fue posible consultar la política de aprobación.'});}
});
router.get('/',authenticateToken,requireRole('ADMIN'),listEmployeesController);
router.put('/:id',authenticateToken,requireRole('ADMIN'),updateEmployeeController);

router.post(
    '/',
    authenticateToken,
    requireRole('ADMIN'),
    createEmployeeController
);

export default router;
