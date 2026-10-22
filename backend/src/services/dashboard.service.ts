import { executeQuery } from '../database/sqlServer';
import { getExpenses } from './expense.service';

interface DashboardExpense {
  Id: number; ReceiptNumber: string; ExpenseDate: string | Date;
  ExpenseTypeName: string; NetAmount: number; VatAmount: number;
  TotalAmount: number; Status: string;
}

export function currentChileMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}`;
}

function offsetMonth(month: string, offset: number) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, value! - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function summarizeExpenses(expenses: DashboardExpense[], month: string, mode: 'month' | 'year' = 'month', now = new Date()) {
  const date = (expense: DashboardExpense) => expense.ExpenseDate instanceof Date
    ? expense.ExpenseDate.toISOString().slice(0, 10) : expense.ExpenseDate.slice(0, 10);
  const inMonth = (period: string) => expenses.filter(expense => date(expense).startsWith(period));
  const total = (items: DashboardExpense[]) => items.reduce((sum, expense) => sum + Number(expense.TotalAmount), 0);
  const year = month.slice(0, 4);
  const today = currentChileMonth(now);
  const endMonth = year === today.slice(0, 4) ? Number(today.slice(5)) : 12;
  const inYear = (value: string) => expenses.filter(expense => date(expense).startsWith(`${value}-`) && Number(date(expense).slice(5, 7)) <= endMonth);
  const current = mode === 'year' ? inYear(year) : inMonth(month);
  const counted = current.filter(expense => expense.Status !== 'REJECTED');
  const previous = mode === 'year' ? inYear(String(Number(year) - 1)) : inMonth(offsetMonth(month, -1));
  const previousTotal = total(previous.filter(expense => expense.Status !== 'REJECTED'));
  const categories = new Map<string, { name: string; amount: number; count: number }>();
  for (const expense of counted) {
    const category = categories.get(expense.ExpenseTypeName) ?? { name: expense.ExpenseTypeName, amount: 0, count: 0 };
    category.amount += Number(expense.TotalAmount); category.count++;
    categories.set(category.name, category);
  }
  const monthTotal = total(counted);
  const dayParts = new Intl.DateTimeFormat('en', { timeZone: 'America/Santiago', day: '2-digit' }).formatToParts(now);
  const lastRecordedDay = counted.reduce((last, expense) => Math.max(last, Number(date(expense).slice(8, 10))), 0);
  const daysInPeriod = month === today ? Math.max(Number(dayParts.find(part => part.type === 'day')!.value), lastRecordedDay)
    : new Date(Date.UTC(Number(year), Number(month.slice(5)), 0)).getUTCDate();
  return {
    month, mode, total: monthTotal, previousTotal,
    comparisonLabel: mode === 'year' ? (endMonth < 12 ? 'mismo tramo del año anterior' : 'año anterior') : 'mes anterior',
    periodLabel: mode === 'year' ? `${year} · enero a ${new Date(Date.UTC(2026, endMonth - 1, 15)).toLocaleDateString('es-CL', { month: 'long', timeZone: 'America/Santiago' })}` : month,
    changePercent: previousTotal > 0 ? Math.round((monthTotal - previousTotal) / previousTotal * 100) : null,
    receiptCount: current.length,
    net: counted.reduce((sum, expense) => sum + Number(expense.NetAmount), 0),
    vat: counted.reduce((sum, expense) => sum + Number(expense.VatAmount), 0),
    states: ['PENDING', 'APPROVED', 'REJECTED'].map(status => ({
      status, count: current.filter(expense => expense.Status === status).length,
      amount: total(current.filter(expense => expense.Status === status)),
    })),
    pendingAllTime: expenses.filter(expense => expense.Status === 'PENDING').length,
    categories: [...categories.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)),
    daily: mode === 'year' ? [] : Array.from({ length: daysInPeriod }, (_, index) => {
      const day = `${month}-${String(index + 1).padStart(2, '0')}`;
      return { date: day, amount: total(counted.filter(expense => date(expense) === day)) };
    }),
    trend: Array.from({ length: mode === 'year' ? endMonth : 6 }, (_, index) => {
      const period = mode === 'year' ? `${year}-${String(index + 1).padStart(2, '0')}` : offsetMonth(month, index - 5);
      return { month: period, amount: total(inMonth(period).filter(expense => expense.Status !== 'REJECTED')) };
    }),
    recent: [...current].sort((a, b) => date(b).localeCompare(date(a)) || b.Id - a.Id).slice(0, 4).map(expense => ({
      id: expense.Id, receiptNumber: expense.ReceiptNumber, date: date(expense),
      type: expense.ExpenseTypeName, total: Number(expense.TotalAmount), status: expense.Status,
    })),
  };
}

export async function getDashboard(companyId: number, userId: number, role: string, month: string, mode: 'month' | 'year' = 'month', scope: 'personal' | 'company' = 'company') {
  const companies = await executeQuery<{ Name: string }>('SELECT Name FROM dbo.Company WHERE Id = ? AND IsActive = 1;', [companyId]);
  if (!companies[0]) throw new Error('COMPANY_UNAVAILABLE');
  const companyScope=role==='ADMIN' && scope==='company';
  const expenses = await getExpenses(companyId, userId, companyScope ? 'ADMIN' : 'EMPLOYEE');
  return { companyName: companies[0].Name, scope: companyScope ? 'company' : 'personal',
    generatedAt: new Date().toISOString(), ...summarizeExpenses(expenses, month, mode) };
}
