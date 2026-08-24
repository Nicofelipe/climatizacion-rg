import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { testDatabaseConnection } from './database/sqlServer';

const app = express();

const PORT = process.env.PORT ?? 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
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

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});