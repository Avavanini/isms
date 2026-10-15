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

export function createApp({ databaseCheck = checkDatabaseConnection, auth = authService, users = userService, inventory = inventoryService } = {}) {
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
  app.use('/api', createHealthRouter(databaseCheck));
  app.use('/api/auth', createAuthRouter(auth));
  app.use('/api/users', createUsersRouter(auth, users));
  app.use('/api', createInventoryRouter(auth, inventory));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export default createApp();
