import { Response } from 'express';

import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    createExpense,
    deleteExpense,
    getExpenseById,
    getExpenses,
    updateExpense,
} from '../services/expense.service';

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

export async function getExpensesController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const expenses = await getExpenses(
      req.user.companyId
    );

    res.status(200).json({
      expenses,
    });
  } catch (error) {
    console.error('Get expenses error:', error);

    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

export async function getExpenseByIdController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const expenseId = Number(req.params.id);

    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      res.status(400).json({
        message: 'Invalid expense id',
      });
      return;
    }

    const expense = await getExpenseById(
      req.user.companyId,
      expenseId
    );

    if (!expense) {
      res.status(404).json({
        message: 'Expense not found',
      });
      return;
    }

    res.status(200).json({
      expense,
    });
  } catch (error) {
    console.error('Get expense detail error:', error);

    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

export async function updateExpenseController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const expenseId = Number(req.params.id);

    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      res.status(400).json({
        message: 'Invalid expense id',
      });
      return;
    }

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

    const expense = await updateExpense({
      companyId: req.user.companyId,
      expenseId,
      expenseTypeId,
      supplierId,
      receiptNumber,
      expenseDate,
      totalAmount,
      description,
    });

    if (!expense) {
      res.status(404).json({
        message: 'Expense not found',
      });
      return;
    }

    res.status(200).json({
      message: 'Expense updated successfully',
      expense,
    });
  } catch (error) {
    console.error('Update expense error:', error);

    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

export async function deleteExpenseController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const expenseId = Number(req.params.id);

    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      res.status(400).json({
        message: 'Invalid expense id',
      });
      return;
    }

    const expense = await deleteExpense(
      req.user.companyId,
      expenseId
    );

    if (!expense) {
      res.status(404).json({
        message: 'Expense not found',
      });
      return;
    }

    res.status(200).json({
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Delete expense error:', error);

    res.status(500).json({
      message: 'Internal server error',
    });
  }
}