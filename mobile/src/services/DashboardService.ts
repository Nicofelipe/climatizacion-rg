import { requestJson } from '@/api/http';

export interface DashboardData {
  companyName: string; scope: 'company' | 'personal'; generatedAt: string;
  month: string; total: number; previousTotal: number; changePercent: number | null;
  mode: 'month' | 'year'; comparisonLabel: string; periodLabel: string;
  receiptCount: number; net: number; vat: number; pendingAllTime: number;
  states: { status: string; count: number; amount: number }[];
  categories: { name: string; amount: number; count: number }[];
  trend: { month: string; amount: number }[];
  daily: { date: string; amount: number }[];
  recent: { id: number; receiptNumber: string; date: string; type: string; total: number; status: string }[];
}
export class DashboardService {
  static async getDashboard(token: string, month: string, mode: 'month' | 'year' = 'month'): Promise<DashboardData> {
    return requestJson(`${process.env.EXPO_PUBLIC_API_URL}/dashboard?month=${encodeURIComponent(month)}&mode=${mode}`,
      { headers: { Authorization: `Bearer ${token}` } });
  }
}
