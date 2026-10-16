import { Router } from 'express';
import { purchaseOrderService } from '../services/purchaseOrderService.js';

export function createPurchaseOrderRouter(auth) {
  const router = Router();

  // Low stock auto-alerts
  router.get('/alerts/low-stock', async (_req, res, next) => {
    try {
      const alerts = await purchaseOrderService.getLowStockAlerts();
      res.status(200).json({ success: true, data: alerts });
    } catch (err) {
      next(err);
    }
  });

  // Automated trigger to create draft POs for low stock items
  router.post('/alerts/trigger-reorders', async (req, res, next) => {
    try {
      const user = await auth.getCurrentUser(req);
      const orders = await purchaseOrderService.autoGenerateReorderPOs(user);
      res.status(201).json({
        success: true,
        data: {
          message: `Successfully generated ${orders.length} automated draft purchase orders!`,
          orders
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // List POs
  router.get('/purchase-orders', async (req, res, next) => {
    try {
      const pos = await purchaseOrderService.listPurchaseOrders(req.query);
      res.status(200).json({ success: true, data: pos });
    } catch (err) {
      next(err);
    }
  });

  // Get PO by ID
  router.get('/purchase-orders/:id', async (req, res, next) => {
    try {
      const po = await purchaseOrderService.getPurchaseOrderById(req.params.id);
      if (!po) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Purchase Order not found' }
        });
      }
      res.status(200).json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  });

  // Create PO
  router.post('/purchase-orders', async (req, res, next) => {
    try {
      const { supplier_id, destination_warehouse_id, items } = req.body || {};
      if (!supplier_id || !destination_warehouse_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Supplier ID, destination warehouse ID, and at least one item line are required'
          }
        });
      }
      const user = await auth.getCurrentUser(req);
      const po = await purchaseOrderService.createPurchaseOrder(req.body, user);
      res.status(201).json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  });

  // Status updates & lifecycle actions
  router.post('/purchase-orders/:id/approve', async (req, res, next) => {
    try {
      const user = await auth.getCurrentUser(req);
      const po = await purchaseOrderService.updateStatus(req.params.id, 'ORDERED', user);
      if (!po) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PO not found' } });
      }
      res.status(200).json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  });

  router.post('/purchase-orders/:id/receive', async (req, res, next) => {
    try {
      const user = await auth.getCurrentUser(req);
      const po = await purchaseOrderService.receivePurchaseOrder(req.params.id, user);
      if (!po) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PO not found' } });
      }
      res.status(200).json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  });

  router.post('/purchase-orders/:id/cancel', async (req, res, next) => {
    try {
      const user = await auth.getCurrentUser(req);
      const po = await purchaseOrderService.updateStatus(req.params.id, 'CANCELLED', user);
      if (!po) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PO not found' } });
      }
      res.status(200).json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/purchase-orders/:id/status', async (req, res, next) => {
    try {
      const { status } = req.body || {};
      if (!status) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Status is required' } });
      }
      const user = await auth.getCurrentUser(req);
      const po = await purchaseOrderService.updateStatus(req.params.id, status, user);
      res.status(200).json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
