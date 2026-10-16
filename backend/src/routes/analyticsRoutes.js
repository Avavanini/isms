import { Router } from 'express';
import { analyticsService } from '../services/analyticsService.js';

export function createAnalyticsRouter() {
  const router = Router();

  router.get('/metrics', async (_req, res, next) => {
    try {
      const data = await analyticsService.getDashboardMetrics();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

  router.get('/fsn', async (_req, res, next) => {
    try {
      const data = await analyticsService.getFsnAnalysis();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

  router.get('/reports/stock-audit', async (_req, res, next) => {
    try {
      const data = await analyticsService.getStockAuditReport();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

  // Export as CSV
  router.get('/reports/export-csv', async (_req, res, next) => {
    try {
      const data = await analyticsService.getStockAuditReport();
      const headers = ['Warehouse', 'Code', 'SKU', 'Item Name', 'Quantity', 'Unit', 'Unit Price ($)', 'Asset Value ($)', 'Threshold', 'Status'];
      const csvRows = [headers.join(',')];

      for (const row of data) {
        const values = [
          `"${row.warehouse}"`,
          `"${row.warehouse_code}"`,
          `"${row.sku}"`,
          `"${row.item_name}"`,
          row.quantity_on_hand,
          `"${row.unit_of_measure}"`,
          row.unit_price,
          row.total_asset_value,
          row.threshold,
          `"${row.status}"`
        ];
        csvRows.push(values.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="isms_stock_audit_report.csv"');
      res.status(200).send(csvRows.join('\n'));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
