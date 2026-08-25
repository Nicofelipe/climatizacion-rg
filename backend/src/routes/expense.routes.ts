import { Router } from 'express';

import { createExpenseController } from '../controllers/expense.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticateToken, createExpenseController);

export default router;