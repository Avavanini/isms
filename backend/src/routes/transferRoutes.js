import { Router } from 'express';
import { transferService } from '../services/transferService.js';

export function createTransferRouter(auth) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const transfers = await transferService.listTransfers(req.query);
      res.status(200).json({ success: true, data: transfers });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const transfer = await transferService.getTransferById(req.params.id);
      if (!transfer) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Stock transfer not found' }
        });
      }
      res.status(200).json({ success: true, data: transfer });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { source_warehouse_id, destination_warehouse_id, items } = req.body || {};
      if (!source_warehouse_id || !destination_warehouse_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Source warehouse, destination warehouse, and at least one item line are required' }
        });
      }
      const user = await auth.getCurrentUser(req);
      const transfer = await transferService.createTransfer(req.body, user);
      res.status(201).json({ success: true, data: transfer });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/approve', async (req, res, next) => {
    try {
      const user = await auth.getCurrentUser(req);
      const transfer = await transferService.approveTransfer(req.params.id, user);
      res.status(200).json({ success: true, data: transfer });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/dispatch', async (req, res, next) => {
    try {
      const user = await auth.getCurrentUser(req);
      const transfer = await transferService.dispatchTransfer(req.params.id, user);
      res.status(200).json({ success: true, data: transfer });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/receive', async (req, res, next) => {
    try {
      const user = await auth.getCurrentUser(req);
      const transfer = await transferService.receiveTransfer(req.params.id, user);
      res.status(200).json({ success: true, data: transfer });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', async (req, res, next) => {
    try {
      const transfer = await transferService.cancelTransfer(req.params.id);
      res.status(200).json({ success: true, data: transfer });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
