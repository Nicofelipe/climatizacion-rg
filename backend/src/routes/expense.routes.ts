import { Router } from 'express';

import {
    createExpenseController,
    deleteExpenseController,
    getExpenseByIdController,
    getExpensesController,
    updateExpenseController
} from '../controllers/expense.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { uploadReceiptImage,validateReceiptImage } from '../middlewares/upload.middleware';
import { fixedWindowLimit } from '../middlewares/security.middleware';
import { getExpenseImageController } from '../controllers/expenseImage.controller';
import { reviewExpensesController } from '../controllers/expenseReview.controller';
import { requireRole } from '../middlewares/role.middleware';
import { getPendingReviews } from '../services/pendingReview.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { correctExpenseController, expenseHistoryController, retryExpenseSyncController } from '../controllers/expenseCorrection.controller';

const router = Router();
const uploadLimit=fixedWindowLimit(30,300000,req=>{
  const user=(req as AuthenticatedRequest).user!;return `${user.companyId}:${user.userId}`;
});

router.get('/', authenticateToken, getExpensesController);
router.get('/pending-review',authenticateToken,requireRole('ADMIN'),async(req:AuthenticatedRequest,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{const rows=await getPendingReviews(req.user!.companyId,req.user!.userId);res.json({ids:rows.map(row=>row.Id),count:rows.length});}
  catch{res.status(503).json({message:'No fue posible consultar las boletas pendientes de revisión.'});}
});
router.post('/review', authenticateToken, requireRole('ADMIN'), reviewExpensesController);

router.get('/:id', authenticateToken, getExpenseByIdController);
router.get('/:id/history', authenticateToken, expenseHistoryController);
router.post('/:id/corrections', authenticateToken, requireRole('ADMIN'), correctExpenseController);
router.post('/:id/sync', authenticateToken, requireRole('ADMIN'), retryExpenseSyncController);
router.get('/:id/image', authenticateToken, getExpenseImageController);

router.post(
    '/',
    authenticateToken,
    uploadLimit,
    uploadReceiptImage.single('image'),
    validateReceiptImage,
    createExpenseController
);

router.put(
  '/:id',
  authenticateToken,
  uploadLimit,
  uploadReceiptImage.single('image'),
  validateReceiptImage,
  updateExpenseController
);

router.delete('/:id', authenticateToken, deleteExpenseController);

export default router;
