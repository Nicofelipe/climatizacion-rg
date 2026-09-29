import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';

import expenseRoutes from './routes/expense.routes';

import path from 'path';

import storageRoutes from './routes/storage.routes';

const app = express();

const PORT = process.env.PORT ?? 3000;


app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'))
);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/storage', storageRoutes);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});