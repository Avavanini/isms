import { Router } from 'express';

export function createHealthRouter(databaseCheck) {
  const router = Router();

  router.get('/health', async (_req, res) => {
    try {
      const isConnected = await databaseCheck();
      if (!isConnected) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database is unavailable'
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          status: 'ok',
          database: 'connected',
          timestamp: new Date().toISOString()
        }
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Health check failed'
        }
      });
    }
  });

  return router;
}
