import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { listBudgets, setBudget } from '../services/budget.service';

const router = Router();
router.use(authenticateToken, requireRole('ADMIN'));

router.get('/', async (req: AuthenticatedRequest, res) => {
  try { res.json({ budgets: await listBudgets(req.user!.companyId) }); }
  catch { res.status(503).json({ message: 'No fue posible consultar los presupuestos.' }); }
});

router.put('/', async (req: AuthenticatedRequest, res) => {
  const { userId = null, amount = null } = req.body ?? {};
  if ((userId !== null && (!Number.isSafeInteger(userId) || userId <= 0))
    || (amount !== null && (!Number.isSafeInteger(amount) || amount <= 0 || amount > 999999999999))) {
    res.status(400).json({ message: 'Indica un presupuesto mensual en pesos enteros, mayor que cero.' }); return;
  }
  try {
    await setBudget({ companyId: req.user!.companyId, actorId: req.user!.userId, userId, amount });
    res.json({ message: amount === null ? 'Presupuesto eliminado.' : 'Presupuesto guardado.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('BUDGET_FORBIDDEN')) { res.status(403).json({ message: 'Tu cuenta no puede cambiar presupuestos.' }); return; }
    if (message.includes('BUDGET_USER_NOT_FOUND')) { res.status(404).json({ message: 'Ese integrante no está disponible.' }); return; }
    res.status(500).json({ message: 'No fue posible guardar el presupuesto.' });
  }
});
export default router;
