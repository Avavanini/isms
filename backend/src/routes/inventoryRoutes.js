import { Router } from 'express';

export function createInventoryRouter(_auth, inventory) {
  const router = Router();

  router.get('/warehouses', async (_req, res, next) => {
    try {
      const warehouses = await inventory.listWarehouses();
      res.status(200).json({ success: true, data: warehouses });
    } catch (err) {
      next(err);
    }
  });

  router.get('/categories', async (_req, res, next) => {
    try {
      const categories = await inventory.listCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  });

  router.get('/items', async (req, res, next) => {
    try {
      const items = await inventory.listItems(req.query);
      res.status(200).json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  });

  router.get('/stock/levels', async (req, res, next) => {
    try {
      const levels = await inventory.getStockLevels(req.query);
      res.status(200).json({ success: true, data: levels });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
