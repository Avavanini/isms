import { Router } from 'express';

export function createUsersRouter(_auth, users) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const list = await users.listUsers();
      res.status(200).json({
        success: true,
        data: list
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
