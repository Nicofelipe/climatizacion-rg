import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Expense, ExpenseFilters, ExpensePage, searchExpensesApi } from '@/api/expense.api';

const PAGE_SIZE = 25;

/** Listado por páginas. Un filtro nuevo cancela la consulta anterior para no mezclar resultados. */
export function useExpenses(token: string | null, filters: ExpenseFilters) {
  const key = JSON.stringify(filters);
  const [items, setItems] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Pick<ExpensePage, 'states' | 'total'> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const focused = useRef(false);

  const load = useCallback(async (next: number) => {
    pending.current?.abort();
    if (!token) { setItems([]); setLoading(false); return; }
    const controller = new AbortController();
    pending.current = controller;
    if (next === 1) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const result = await searchExpensesApi(token, JSON.parse(key) as ExpenseFilters, next, PAGE_SIZE, controller.signal);
      if (controller.signal.aborted) return;
      setItems(current => next === 1 ? result.expenses : [...current, ...result.expenses.filter(item => !current.some(known => known.Id === item.Id))]);
      setSummary({ states: result.states, total: result.total });
      setPage(next);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'No fue posible obtener las boletas.');
    } finally {
      if (!controller.signal.aborted) { setLoading(false); setLoadingMore(false); }
    }
  }, [token, key]);

  // Al volver a la pantalla se actualiza; mientras está abierta, al cambiar un filtro.
  useFocusEffect(useCallback(() => {
    focused.current = true;
    void load(1);
    return () => { focused.current = false; pending.current?.abort(); };
  }, [load]));
  useEffect(() => () => pending.current?.abort(), []);

  const hasMore = summary !== null && items.length < summary.total;
  return {
    items, summary, loading, loadingMore, error, hasMore,
    reload: () => { void load(1); },
    loadMore: () => { if (hasMore && !loading && !loadingMore && !error) void load(page + 1); },
  };
}
