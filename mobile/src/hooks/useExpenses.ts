import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import type { Expense } from '@/api/expense.api';
import { getExpenses } from '@/services/ExpenseService';

export function useExpenses(token: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pending=useRef<AbortController|null>(null);

  const loadExpenses = useCallback(async () => {
    pending.current?.abort();
    const controller=new AbortController();pending.current=controller;
    if (!token) {
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getExpenses(token,controller.signal);

      if(!controller.signal.aborted)setExpenses(data);
    } catch (err) {
      if(controller.signal.aborted)return;
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible obtener las boletas'
      );
    } finally {
      if(!controller.signal.aborted)setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    loadExpenses();
    return()=>pending.current?.abort();
  }, [loadExpenses]));

  return {
    expenses,
    isLoading,
    error,
    reload: loadExpenses,
  };
}
