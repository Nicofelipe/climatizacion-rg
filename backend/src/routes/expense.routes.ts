import { Router } from 'express';

import {
    createExpenseController,
    deleteExpenseController,
    getExpenseByIdController,
    getExpensesController,
    updateExpenseController
} from '../controllers/expense.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { uploadReceiptImage } from '../middlewares/upload.middleware';
import { getExpenseImageController } from '../controllers/expenseImage.controller';
import { reviewExpensesController } from '../controllers/expenseReview.controller';
import { requireRole } from '../middlewares/role.middleware';
import { correctExpenseController, expenseHistoryController, retryExpenseSyncController } from '../controllers/expenseCorrection.controller';

const router = Router();

router.get('/', authenticateToken, getExpensesController);
router.post('/review', authenticateToken, requireRole('ADMIN'), reviewExpensesController);

router.get('/:id', authenticateToken, getExpenseByIdController);
router.get('/:id/history', authenticateToken, expenseHistoryController);
router.post('/:id/corrections', authenticateToken, requireRole('ADMIN'), correctExpenseController);
router.post('/:id/sync', authenticateToken, requireRole('ADMIN'), retryExpenseSyncController);
router.get('/:id/image', authenticateToken, getExpenseImageController);

router.post(
    '/',
    authenticateToken,
    uploadReceiptImage.single('image'),
    createExpenseController
);

router.put(
  '/:id',
  authenticateToken,
  uploadReceiptImage.single('image'),
  updateExpenseController
);

router.delete('/:id', authenticateToken, deleteExpenseController);

export default router;
