import { Router } from 'express';

import { testDatabaseConnection } from '../database/sqlServer';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const database = await testDatabaseConnection();

    res.status(200).json({
      status: 'ok',
      service: 'Climatizacion RG API',
      database,
    });
  } catch (error) {
    console.error('Database connection error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

export default router;