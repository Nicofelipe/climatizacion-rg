import {
    createExpenseApi,
    CreateExpenseRequest,
    getExpensesApi,
} from '@/api/expense.api';

export async function getExpenses(token: string, signal?: AbortSignal) {
  return getExpensesApi(token, signal);
}

export async function createExpense(
  token: string,
  data: CreateExpenseRequest
) {
  return createExpenseApi(token, data);
}
