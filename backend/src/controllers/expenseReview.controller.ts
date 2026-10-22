import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { reviewExpenses } from '../services/expenseReview.service';

export async function reviewExpensesController(req: AuthenticatedRequest, res: Response) {
  if (!req.user) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
  if (req.user.role !== 'ADMIN') { res.status(403).json({ message: 'Solo el administrador puede revisar boletas.' }); return; }
  const { expenseIds, decision, reason } = req.body ?? {};
  if (!Array.isArray(expenseIds) || !expenseIds.length || expenseIds.length > 100 ||
      expenseIds.some(id => !Number.isSafeInteger(id) || id <= 0) ||
      new Set(expenseIds).size !== expenseIds.length || !['APPROVED', 'REJECTED'].includes(decision) ||
      (decision === 'REJECTED' && (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 1000))) {
    res.status(400).json({ message: 'Selecciona hasta 100 boletas pendientes y una decisión válida. Para rechazar debes indicar un motivo de hasta 1000 caracteres.' }); return;
  }
  try {
    const changed = await reviewExpenses({ companyId: req.user.companyId, reviewerId: req.user.userId,
      expenseIds, decision, reason: decision === 'REJECTED' ? reason.trim() : null });
    res.json({ message: decision === 'APPROVED' ? 'Boletas aprobadas.' : 'Boletas rechazadas.', updated: changed.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('SELF_REVIEW_FORBIDDEN')) { res.status(403).json({message:'Otro administrador debe revisar tus boletas. Solo el único administrador activo puede confirmar sus propias rendiciones.'}); return; }
    if (message.includes('REVIEW_FORBIDDEN')) { res.status(403).json({ message: 'Tu cuenta no tiene permiso de revisión.' }); return; }
    if (message.includes('REVIEW_CONFLICT')) { res.status(409).json({ message: 'Alguna boleta ya no está pendiente o no está disponible. No se aplicó ningún cambio; actualiza el listado.' }); return; }
    res.status(500).json({ message: 'No fue posible guardar la revisión.' });
  }
}
