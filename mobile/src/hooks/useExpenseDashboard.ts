import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { DashboardData, DashboardService } from '@/services/DashboardService';

export function useExpenseDashboard(token: string | null, month: string, mode: 'month' | 'year' = 'month',scope: 'personal' | 'company' = 'company') {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setData(null); setError(''); setLoading(true);
    if (!token) { setLoading(false); return; }
    DashboardService.getDashboard(token, month, mode,scope).then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'No fue posible cargar el resumen.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, month, mode, scope, attempt]));
  return { data, loading, error, reload: () => setAttempt(value => value + 1) };
}
