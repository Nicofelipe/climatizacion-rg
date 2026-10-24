import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { DashboardData, DashboardService } from '@/services/DashboardService';

export function useExpenseDashboard(token: string | null, month: string, mode: 'month' | 'year' = 'month',scope: 'personal' | 'company' = 'company') {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const cache = useRef({token, entries:new Map<string,DashboardData>()});
  useFocusEffect(useCallback(() => {
    let active = true;
    const controller = new AbortController();
    if(cache.current.token!==token)cache.current={token,entries:new Map()};
    const key=`${month}:${mode}:${scope}`;
    const previous=cache.current.entries.get(key);
    setData(previous??null); setError(''); setLoading(!previous);
    if (!token) { setLoading(false); return; }
    DashboardService.getDashboard(token, month, mode,scope,controller.signal).then(result => { if (active) {
      if(cache.current.entries.size>=12)cache.current.entries.delete(cache.current.entries.keys().next().value!);
      cache.current.entries.set(key,result);setData(result);
    } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'No fue posible cargar el resumen.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [token, month, mode, scope, attempt]));
  return { data, loading, error, reload: () => setAttempt(value => value + 1) };
}
