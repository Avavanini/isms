import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createHealthRouter } from './routes/healthRoutes.js';
import { checkDatabaseConnection } from './repositories/healthRepository.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createUsersRouter } from './routes/userRoutes.js';
import { authService } from './services/authService.js';
import { userService } from './services/userService.js';
import { httpError } from './utils/httpError.js';
import { createInventoryRouter } from './routes/inventoryRoutes.js';
import { inventoryService } from './services/inventoryService.js';
import { createSupplierRouter } from './routes/supplierRoutes.js';
import { createPurchaseOrderRouter } from './routes/purchaseOrderRoutes.js';
import { createTransferRouter } from './routes/transferRoutes.js';
import { createAnalyticsRouter } from './routes/analyticsRoutes.js';

export function createApp({
  databaseCheck = checkDatabaseConnection,
  auth = authService,
  users = userService,
  inventory = inventoryService
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(httpError(403, 'CORS_ORIGIN_DENIED', 'Origin is not allowed'));
    }
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  // Core & Health
  app.use('/api', createHealthRouter(databaseCheck));
  app.use('/api/auth', createAuthRouter(auth));
  app.use('/api/users', createUsersRouter(auth, users));
  app.use('/api', createInventoryRouter(auth, inventory));

  // Developer 2 Modules: Procurement, Reorders, Transfers, Analytics
  app.use('/api/suppliers', createSupplierRouter());
  app.use('/api', createPurchaseOrderRouter(auth));
  app.use('/api/transfers', createTransferRouter(auth));
  app.use('/api/analytics', createAnalyticsRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export default createApp();
