import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getExpenseById } from '../services/expense.service';
import { correctExpense, getExpenseHistory, syncCorrectedExpense } from '../services/expenseCorrection.service';
import { lockExpenseOperation } from '../services/expenseOperationLock.service';
import { parseVat, receiptTax, VatSource } from '../utils/receiptTax';
import { receiptSubmissionError } from '../utils/receiptSubmission';
import { formErrorMessage } from './expenseForm';

const BUSY = 'La boleta tiene otra operación en curso. Espera y recarga.';
const expenseIdOf = (req: AuthenticatedRequest) => {
  const id = Number(req.params.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export async function expenseHistoryController(req: AuthenticatedRequest, res: Response) {
  if (!req.user) { res.sendStatus(401); return; }
  const id = expenseIdOf(req);
  if (!id) { res.sendStatus(400); return; }
  try {
    if (!await getExpenseById(req.user.companyId, id, req.user.userId, req.user.role)) { res.sendStatus(404); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ history: await getExpenseHistory(req.user.companyId, id) });
  } catch { res.status(500).json({ message: 'No fue posible cargar el historial.' }); }
}

export async function correctExpenseController(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ADMIN') { res.sendStatus(403); return; }
  const id = expenseIdOf(req), body = req.body ?? {};
  const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!id || !validDate(body.expenseDate) || !validDate(body.expectedDate)
    || typeof body.totalAmount !== 'number' || !Number.isSafeInteger(body.totalAmount) || body.totalAmount <= 0 || body.totalAmount > 999999999
    || typeof body.expectedAmount !== 'number' || !Number.isFinite(body.expectedAmount)
    || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 1000) {
    res.status(400).json({ message: 'Revisa la fecha, el monto entero en CLP y el motivo obligatorio (máximo 1000 caracteres).' });
    return;
  }
  if (body.expenseDate !== body.expectedDate) {
    const error = receiptSubmissionError(body.expenseDate);
    if (error) { res.status(400).json({ message: error }); return; }
  }
  const release = lockExpenseOperation(req.user.companyId, id);
  if (!release) { res.status(409).json({ message: BUSY }); return; }
  try {
    const current = await getExpenseById(req.user.companyId, id, req.user.userId, req.user.role);
    if (!current) { res.status(404).json({ message: 'Boleta no disponible.' }); return; }
    // Sin una indicación nueva se conserva cómo se obtuvo el IVA de esta boleta.
    let vat: { source: VatSource; vat: number | null };
    if (body.vatSource === undefined && body.vatAmount === undefined && current.VatSource === 'RECEIPT') {
      if (Number(current.TotalAmount) !== body.totalAmount) {
        res.status(400).json({ message: 'Esta boleta usa el IVA impreso en el documento. Al cambiar el total, indica también su IVA.' });
        return;
      }
      vat = { source: 'RECEIPT', vat: Number(current.VatAmount) };
    } else vat = parseVat(body.vatSource, body.vatAmount, current.VatSource);
    receiptTax(body.totalAmount, vat.source, vat.vat);
    await correctExpense({
      companyId: req.user.companyId, userId: req.user.userId, expenseId: id, expenseDate: body.expenseDate, totalAmount: body.totalAmount,
      reason: body.reason.trim(), expectedDate: body.expectedDate, expectedAmount: body.expectedAmount,
      vatSource: vat.source, vatAmount: vat.vat, expectedVatSource: current.VatSource,
    });
    let syncPending = false;
    try { await syncCorrectedExpense(req.user.companyId, id); } catch { syncPending = true; }
    res.json({ syncPending, message: syncPending ? 'Corrección guardada con historial. Falta sincronizar la carpeta de Drive; puedes reintentarlo desde el detalle.' : 'Corrección guardada con historial.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const invalid = formErrorMessage(error);
    if (invalid) { res.status(400).json({ message: invalid }); return; }
    if (message.includes('CORRECTION_FORBIDDEN')) { res.sendStatus(403); return; }
    if (message.includes('CORRECTION_CONFLICT')) { res.status(409).json({ message: 'Solo se pueden corregir boletas aprobadas, sin sincronización pendiente y con los valores actuales. Recarga el detalle.' }); return; }
    if (message.includes('CORRECTION_UNCHANGED')) { res.status(400).json({ message: 'No hay cambios en fecha, monto o IVA para guardar.' }); return; }
    res.status(500).json({ message: 'No fue posible guardar la corrección.' });
  } finally { release(); }
}

export async function retryExpenseSyncController(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ADMIN') { res.sendStatus(403); return; }
  const id = expenseIdOf(req);
  if (!id) { res.sendStatus(400); return; }
  const release = lockExpenseOperation(req.user.companyId, id);
  if (!release) { res.status(409).json({ message: BUSY }); return; }
  try {
    if (!await getExpenseById(req.user.companyId, id, req.user.userId, req.user.role)) { res.sendStatus(404); return; }
    await syncCorrectedExpense(req.user.companyId, id);
    res.json({ message: 'Respaldo sincronizado.' });
  } catch {
    res.status(503).json({ message: 'No fue posible sincronizar Drive. La corrección y su historial siguen guardados; revisa la conexión y reintenta.' });
  } finally { release(); }
}
