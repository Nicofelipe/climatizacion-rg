import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import authRoutes from './routes/auth.routes';
import expenseRoutes from './routes/expense.routes';
import healthRoutes from './routes/health.routes';
import storageRoutes from './routes/storage.routes';
import userRoutes from './routes/user.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { allowedWebOrigin, privateResponses, safeRequestError } from './middlewares/security.middleware';

const app = express();

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

app.use(helmet());
app.disable('x-powered-by');
app.use(privateResponses);
app.use(allowedWebOrigin);
app.use(cors({origin:true}));
app.use(express.json({limit:'32kb'}));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use(safeRequestError);

const server=app.listen(PORT, HOST, () => {
  console.log(`API running on port ${PORT}`);
});
server.requestTimeout=120000;
server.headersTimeout=20000;
