import { Router } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../middlewares/auth.middleware';
import { currentChileMonth, getDashboard } from '../services/dashboard.service';

const router = Router();
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!req.user) { res.status(401).json({ message: 'Debes iniciar sesión.' }); return; }
  const month = req.query.month ?? currentChileMonth();
  const mode = req.query.mode ?? 'month';
  if (typeof month !== 'string' || !/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month) || month > currentChileMonth() || (mode !== 'month' && mode !== 'year')) {
    res.status(400).json({ message: 'Selecciona un período válido hasta el mes actual.' }); return;
  }
  try {
    const data = await getDashboard(req.user.companyId, req.user.userId, req.user.role, month, mode);
    res.json(data);
  } catch {
    res.status(503).json({ message: 'No fue posible cargar tu resumen. Inténtalo nuevamente.' });
  }
});
export default router;
