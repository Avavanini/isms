import { Router } from 'express';
import { supplierService } from '../services/supplierService.js';

export function createSupplierRouter() {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const suppliers = await supplierService.listSuppliers(req.query);
      res.status(200).json({ success: true, data: suppliers });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const supplier = await supplierService.getSupplierById(req.params.id);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Supplier not found' }
        });
      }
      res.status(200).json({ success: true, data: supplier });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { name, email } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Supplier name and email are required' }
        });
      }
      const supplier = await supplierService.createSupplier(req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const supplier = await supplierService.updateSupplier(req.params.id, req.body);
      res.status(200).json({ success: true, data: supplier });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const supplier = await supplierService.deleteSupplier(req.params.id);
      res.status(200).json({ success: true, data: supplier });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
