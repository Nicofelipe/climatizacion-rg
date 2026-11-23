import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { deleteExpense, ExpenseSearch, getExpenseById, getExpenses, searchExpenses } from '../services/expense.service';
import { safeErrorMessage } from '../utils/storageError';

export { createExpenseController } from './expenseCreate.controller';
export { updateExpenseController } from './expenseUpdate.controller';

const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const positive = (value: unknown) => typeof value === 'string' && /^[1-9]\d{0,8}$/.test(value) ? Number(value) : null;

/** Lista completa. Se mantiene para las aplicaciones instaladas antes de la versión 1.2. */
export async function getExpensesController(req: AuthenticatedRequest, res: Response) {
  if (!req.user) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
  try {
    res.json({ expenses: await getExpenses(req.user.companyId, req.user.userId, req.user.role) });
  } catch (error) {
    console.error('Get expenses error:', safeErrorMessage(error));
    res.status(500).json({ message: 'No fue posible cargar las boletas.' });
  }
}

export async function searchExpensesController(req: AuthenticatedRequest, res: Response) {
  if (!req.user) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
  const { scope = 'company', workerId, status, q, from, to, typeId, review, page = '1', pageSize = '25' } = req.query;
  const pageNumber = positive(page), size = positive(pageSize);
  const invalid = (scope !== 'company' && scope !== 'personal') || (workerId !== undefined && !positive(workerId))
    || (typeId !== undefined && !positive(typeId)) || (status !== undefined && !['PENDING', 'APPROVED', 'REJECTED'].includes(String(status)))
    || (q !== undefined && (typeof q !== 'string' || q.length > 100)) || (from !== undefined && !isDate(from)) || (to !== undefined && !isDate(to))
    || (from !== undefined && to !== undefined && String(from) > String(to)) || !pageNumber || !size || size > 100;
  if (invalid) { res.status(400).json({ message: 'Revisa los filtros: hay un valor que no es válido.' }); return; }
  try {
    const input: ExpenseSearch = {
      companyId: req.user.companyId, userId: req.user.userId, role: req.user.role, scope: scope as 'company' | 'personal',
      workerId: positive(workerId) ?? undefined, status: status as ExpenseSearch['status'], text: typeof q === 'string' ? q.trim() || undefined : undefined,
      from: from as string | undefined, to: to as string | undefined, expenseTypeId: positive(typeId) ?? undefined,
      reviewable: req.user.role === 'ADMIN' && review === '1', page: pageNumber!, pageSize: size!,
    };
    res.json(await searchExpenses(input));
  } catch (error) {
    console.error('Search expenses error:', safeErrorMessage(error));
    res.status(500).json({ message: 'No fue posible cargar las boletas.' });
  }
}

export async function getExpenseByIdController(req: AuthenticatedRequest, res: Response) {
  if (!req.user) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ message: 'La boleta indicada no es válida.' }); return; }
  try {
    const expense = await getExpenseById(req.user.companyId, id, req.user.userId, req.user.role);
    if (!expense) { res.status(404).json({ message: 'Boleta no disponible.' }); return; }
    res.json({ expense });
  } catch (error) {
    console.error('Get expense detail error:', safeErrorMessage(error));
    res.status(500).json({ message: 'No fue posible cargar la boleta.' });
  }
}

export async function deleteExpenseController(req: AuthenticatedRequest, res: Response) {
  if (!req.user) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ message: 'La boleta indicada no es válida.' }); return; }
  try {
    const expense = await deleteExpense(req.user.companyId, id, req.user.userId, req.user.role);
    if (!expense) { res.status(404).json({ message: 'Solo puedes retirar tus propias boletas pendientes.' }); return; }
    res.json({ message: 'Boleta retirada. Su registro y su foto se conservan en el historial.' });
  } catch (error) {
    console.error('Delete expense error:', safeErrorMessage(error));
    res.status(500).json({ message: 'No fue posible retirar la boleta.' });
  }
}
