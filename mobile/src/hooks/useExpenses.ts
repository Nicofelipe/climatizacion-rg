import { useCallback, useEffect, useState } from 'react';

import type { Expense } from '@/api/expense.api';
import { getExpenses } from '@/services/ExpenseService';

export function useExpenses(token: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!token) {
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getExpenses(token);

      setExpenses(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible obtener las boletas'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  return {
    expenses,
    isLoading,
    error,
    reload: loadExpenses,
  };
}