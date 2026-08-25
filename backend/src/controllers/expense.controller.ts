import { Response } from 'express';

import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createExpense } from '../services/expense.service';

export async function createExpenseController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const {
      expenseTypeId,
      supplierId,
      receiptNumber,
      expenseDate,
      totalAmount,
      description,
    } = req.body;

    if (
      !expenseTypeId ||
      !receiptNumber ||
      !expenseDate ||
      !totalAmount
    ) {
      res.status(400).json({
        message: 'Missing required fields',
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const expense = await createExpense({
      companyId: req.user.companyId,
      userId: req.user.userId,
      expenseTypeId,
      supplierId,
      receiptNumber,
      expenseDate,
      totalAmount,
      description,
    });

    res.status(201).json({
      message: 'Expense created successfully',
      expense,
    });
  } catch (error) {
    console.error('Create expense error:', error);

    res.status(500).json({
      message: 'Internal server error',
    });
  }
}