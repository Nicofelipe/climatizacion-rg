import { Router } from 'express';

import { testDatabaseConnection } from '../database/sqlServer';
import { fixedWindowLimit } from '../middlewares/security.middleware';

const router = Router();
router.use(fixedWindowLimit(30,60000,req=>req.ip??'unknown'));

router.get('/', async (_req, res) => {
  try {
    await testDatabaseConnection();

    res.status(200).json({
      status: 'ok',
    });
  } catch (error) {
    console.error('Database health check failed');

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

export default router;
