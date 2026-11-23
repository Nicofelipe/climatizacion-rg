import { API_URL, authorized, requestJson } from '@/api/http';

interface Group { name: string; amount: number; count: number }
export interface DashboardData {
  companyName: string; scope: 'company' | 'personal'; generatedAt: string;
  month: string; total: number; previousTotal: number; changePercent: number | null;
  mode: 'month' | 'year'; comparisonLabel: string; periodLabel: string;
  receiptCount: number; net: number; vat: number; pendingAllTime: number;
  states: { status: string; count: number; amount: number }[];
  categories: Group[]; suppliers: Group[]; workers: Group[];
  trend: { month: string; amount: number }[];
  daily: { date: string; amount: number }[];
  budget: { monthly: number; amount: number; spent: number; remaining: number; percent: number } | null;
  recent: { id: number; receiptNumber: string; date: string; type: string; supplier: string | null; total: number; status: string }[];
}

export class DashboardService {
  static async getDashboard(token: string, month: string, mode: 'month' | 'year' = 'month', scope: 'personal' | 'company' = 'company', signal?: AbortSignal): Promise<DashboardData> {
    return requestJson(`${API_URL}/dashboard?month=${encodeURIComponent(month)}&mode=${mode}&scope=${scope}`, { headers: authorized(token), signal });
  }
}
