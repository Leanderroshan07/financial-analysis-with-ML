import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/environment';
import purchaseAdvisorRoutes from './modules/purchase-advisor/routes/purchase-advisor.routes';
import financialRoutes from './modules/financial/routes/financial.routes';
import authRoutes from './modules/auth/routes/auth.routes';
import accountsRoutes from './modules/accounts/routes/accounts.routes';
import tasksRoutes from './modules/tasks/routes/tasks.routes';
import goalsRoutes from './modules/goals/routes/goals.routes';
import dashboardRoutes from './modules/dashboard/routes/dashboard.routes';
import emiRoutes from './modules/emi/emi.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import { logger } from './utils/logger';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.debug(`Incoming request`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'moneyyy-backend',
    timestamp: new Date().toISOString(),
  });
});

app.use('/auth', authRoutes);
app.use('/api/v1/purchase-advisor', purchaseAdvisorRoutes);
app.use('/api/v1/financial', financialRoutes);
app.use('/api/v1/accounts', accountsRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/goals', goalsRoutes);
app.use('/api/v1/emi', emiRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  });
});

export default app;
