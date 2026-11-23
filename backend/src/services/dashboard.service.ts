import { executeQuery } from '../database/sqlServer';
import { getBudget } from './budget.service';
import { countPending, getExpenses } from './expense.service';

interface DashboardExpense {
  Id: number; ReceiptNumber: string; ExpenseDate: string | Date;
  ExpenseTypeName: string; NetAmount: number; VatAmount: number;
  TotalAmount: number; Status: string; UserId?: number; UserName?: string; SupplierName?: string | null;
}

function chileDay(now: Date) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function currentChileMonth(now = new Date()) {
  return chileDay(now).slice(0, 7);
}

function offsetMonth(month: string, offset: number) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, value! - 1 + offset, 1)).toISOString().slice(0, 7);
}
const lastDay = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();

/** Fechas que necesita el resumen: el período, el anterior comparable y la tendencia. */
export function dashboardRange(month: string, mode: 'month' | 'year') {
  if (mode === 'year') return { from: `${Number(month.slice(0, 4)) - 1}-01-01`, to: `${month.slice(0, 4)}-12-31` };
  return { from: `${offsetMonth(month, -5)}-01`, to: `${month}-${lastDay(month)}` };
}

export function summarizeExpenses(expenses: DashboardExpense[], month: string, mode: 'month' | 'year' = 'month', now = new Date()) {
  const date = (expense: DashboardExpense) => expense.ExpenseDate instanceof Date
    ? expense.ExpenseDate.toISOString().slice(0, 10) : expense.ExpenseDate.slice(0, 10);
  const inMonth = (period: string) => expenses.filter(expense => date(expense).startsWith(period));
  const total = (items: DashboardExpense[]) => items.reduce((sum, expense) => sum + Number(expense.TotalAmount), 0);
  const year = month.slice(0, 4);
  const todayDate = chileDay(now);
  const today = todayDate.slice(0, 7);
  const day = Number(todayDate.slice(8));
  const ongoingMonth = mode === 'month' && month === today;
  const ongoingYear = mode === 'year' && year === today.slice(0, 4);
  const endMonth = ongoingYear ? Number(today.slice(5)) : 12;
  const inYear = (value: string) => expenses.filter(expense => date(expense).startsWith(`${value}-`) && Number(date(expense).slice(5, 7)) <= endMonth);
  const current = mode === 'year' ? inYear(year) : inMonth(month);
  const counted = current.filter(expense => expense.Status !== 'REJECTED');

  // Un período en curso se compara con el mismo tramo del anterior, no con el período completo.
  const previousMonth = offsetMonth(month, -1);
  const previousYear = String(Number(year) - 1);
  const previousLimit = ongoingYear ? `${previousYear}${todayDate.slice(4)}`
    : ongoingMonth ? `${previousMonth}-${String(Math.min(day, lastDay(previousMonth))).padStart(2, '0')}` : null;
  const previous = (mode === 'year' ? expenses.filter(expense => date(expense).startsWith(`${previousYear}-`)) : inMonth(previousMonth))
    .filter(expense => expense.Status !== 'REJECTED' && (!previousLimit || date(expense) <= previousLimit));
  const comparableTotal = total(counted.filter(expense => !previousLimit || date(expense) <= todayDate));
  const previousTotal = total(previous);

  const groupBy = (key: (expense: DashboardExpense) => string | null | undefined) => {
    const groups = new Map<string, { name: string; amount: number; count: number }>();
    for (const expense of counted) {
      const name = key(expense);
      if (!name) continue;
      const group = groups.get(name) ?? { name, amount: 0, count: 0 };
      group.amount += Number(expense.TotalAmount);
      group.count++;
      groups.set(name, group);
    }
    return [...groups.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  };
  const monthTotal = total(counted);
  const lastRecordedDay = counted.reduce((last, expense) => Math.max(last, Number(date(expense).slice(8, 10))), 0);
  const daysInPeriod = ongoingMonth ? Math.max(day, lastRecordedDay) : lastDay(month);
  return {
    month, mode, total: monthTotal, previousTotal,
    comparisonLabel: mode === 'year' ? (ongoingYear ? 'mismo tramo del año anterior' : 'año anterior')
      : ongoingMonth ? 'mismo tramo del mes anterior' : 'mes anterior',
    periodLabel: mode === 'year' ? `${year} · enero a ${new Date(Date.UTC(2026, endMonth - 1, 15)).toLocaleDateString('es-CL', { month: 'long', timeZone: 'America/Santiago' })}` : month,
    changePercent: previousTotal > 0 ? Math.round((comparableTotal - previousTotal) / previousTotal * 100) : null,
    receiptCount: current.length,
    net: counted.reduce((sum, expense) => sum + Number(expense.NetAmount), 0),
    vat: counted.reduce((sum, expense) => sum + Number(expense.VatAmount), 0),
    states: ['PENDING', 'APPROVED', 'REJECTED'].map(status => ({
      status, count: current.filter(expense => expense.Status === status).length,
      amount: total(current.filter(expense => expense.Status === status)),
    })),
    pendingAllTime: expenses.filter(expense => expense.Status === 'PENDING').length,
    categories: groupBy(expense => expense.ExpenseTypeName),
    suppliers: groupBy(expense => expense.SupplierName).slice(0, 5),
    workers: groupBy(expense => expense.UserName).slice(0, 8),
    daily: mode === 'year' ? [] : Array.from({ length: daysInPeriod }, (_, index) => {
      const key = `${month}-${String(index + 1).padStart(2, '0')}`;
      return { date: key, amount: total(counted.filter(expense => date(expense) === key)) };
    }),
    trend: Array.from({ length: mode === 'year' ? endMonth : 6 }, (_, index) => {
      const period = mode === 'year' ? `${year}-${String(index + 1).padStart(2, '0')}` : offsetMonth(month, index - 5);
      return { month: period, amount: total(inMonth(period).filter(expense => expense.Status !== 'REJECTED')) };
    }),
    recent: [...current].sort((a, b) => date(b).localeCompare(date(a)) || b.Id - a.Id).slice(0, 5).map(expense => ({
      id: expense.Id, receiptNumber: expense.ReceiptNumber, date: date(expense), supplier: expense.SupplierName ?? null,
      type: expense.ExpenseTypeName, total: Number(expense.TotalAmount), status: expense.Status,
    })),
  };
}

/** Uso del presupuesto mensual. En la vista anual se compara con los meses transcurridos. */
export function budgetUsage(monthly: number | null, spent: number, months: number) {
  if (!monthly) return null;
  const amount = monthly * months;
  return { monthly, amount, spent, remaining: amount - spent, percent: Math.round(spent / amount * 1000) / 10 };
}

export async function getDashboard(companyId: number, userId: number, role: string, month: string, mode: 'month' | 'year' = 'month', scope: 'personal' | 'company' = 'company') {
  const companies = await executeQuery<{ Name: string }>('SELECT Name FROM dbo.Company WHERE Id = ? AND IsActive = 1;', [companyId]);
  if (!companies[0]) throw new Error('COMPANY_UNAVAILABLE');
  const companyScope = role === 'ADMIN' && scope === 'company';
  const scopeRole = companyScope ? 'ADMIN' : 'EMPLOYEE';
  const [expenses, pendingAllTime, monthlyBudget] = await Promise.all([
    getExpenses(companyId, userId, scopeRole, dashboardRange(month, mode)),
    countPending(companyId, userId, scopeRole),
    getBudget(companyId, companyScope ? null : userId),
  ]);
  const summary = summarizeExpenses(expenses, month, mode);
  return {
    companyName: companies[0].Name, scope: companyScope ? 'company' : 'personal', generatedAt: new Date().toISOString(),
    ...summary, pendingAllTime, workers: companyScope ? summary.workers : [],
    budget: budgetUsage(monthlyBudget, summary.total, mode === 'year' ? summary.trend.length : 1),
  };
}
