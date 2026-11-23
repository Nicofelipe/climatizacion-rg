import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { searchSuppliers } from '../services/supplier.service';

const router = Router();
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const text = req.query.q ?? '';
  if (typeof text !== 'string' || text.length > 100) { res.status(400).json({ message: 'La búsqueda no es válida.' }); return; }
  try { res.json({ suppliers: await searchSuppliers(req.user!.companyId, text) }); }
  catch { res.status(503).json({ message: 'No fue posible consultar los comercios.' }); }
});
export default router;
