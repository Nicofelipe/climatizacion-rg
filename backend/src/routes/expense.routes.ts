import { Router } from 'express';

import {
    createExpenseController,
    deleteExpenseController,
    getExpenseByIdController,
    getExpensesController,
    updateExpenseController
} from '../controllers/expense.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getExpensesController);

router.get('/:id', authenticateToken, getExpenseByIdController);

router.post('/', authenticateToken, createExpenseController);

router.put('/:id', authenticateToken, updateExpenseController);

router.delete('/:id', authenticateToken, deleteExpenseController);

export default router;