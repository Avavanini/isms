import { inventoryService } from './inventoryService.js';
import { purchaseOrderService } from './purchaseOrderService.js';
import { transferService } from './transferService.js';

export const analyticsService = {
  async getDashboardMetrics() {
    const items = await inventoryService.listItems();
    const stockLevels = await inventoryService.getStockLevels();
    const pos = await purchaseOrderService.listPurchaseOrders();
    const transfers = await transferService.listTransfers();
    const lowStockAlerts = await purchaseOrderService.getLowStockAlerts();

    // 1. Total Valuation
    let totalInventoryValue = 0;
    for (const sl of stockLevels) {
      const price = Number(sl.unit_price) || 0;
      const qty = Number(sl.quantity) || 0;
      totalInventoryValue += price * qty;
    }

    // 2. Active PO Metrics
    const activePOs = pos.filter((po) => po.status === 'ORDERED' || po.status === 'PENDING_APPROVAL');
    const activePOValue = activePOs.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);

    // 3. In-Transit Transfers
    const inTransitTransfers = transfers.filter((t) => t.status === 'DISPATCHED');

    // 4. Warehouse Valuation Breakdown
    const warehouses = await inventoryService.listWarehouses();
    const warehouseMetrics = warehouses.map((w) => {
      const wStock = stockLevels.filter((s) => String(s.warehouse_id) === String(w.id));
      const value = wStock.reduce((sum, s) => sum + (Number(s.unit_price) * Number(s.quantity)), 0);
      const itemCount = wStock.length;
      const lowCount = wStock.filter((s) => s.is_low_stock).length;
      return {
        warehouse_id: w.id,
        warehouse_name: w.name,
        warehouse_code: w.warehouse_code,
        valuation: Number(value.toFixed(2)),
        sku_count: itemCount,
        low_stock_count: lowCount
      };
    });

    // 5. Category Valuation Breakdown
    const categories = await inventoryService.listCategories();
    const categoryMetrics = categories.map((c) => {
      const catItems = items.filter((i) => String(i.category_id) === String(c.id));
      const catItemIds = new Set(catItems.map((i) => i.id));
      const catStock = stockLevels.filter((s) => catItemIds.has(s.item_id));
      const value = catStock.reduce((sum, s) => sum + (Number(s.unit_price) * Number(s.quantity)), 0);
      return {
        category_id: c.id,
        category_name: c.name,
        item_count: catItems.length,
        valuation: Number(value.toFixed(2))
      };
    });

    return {
      overview: {
        total_valuation: Number(totalInventoryValue.toFixed(2)),
        total_sku_count: items.length,
        total_units_in_stock: stockLevels.reduce((sum, s) => sum + Number(s.quantity), 0),
        low_stock_alert_count: lowStockAlerts.length,
        critical_alert_count: lowStockAlerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'OUT_OF_STOCK').length,
        active_pos_count: activePOs.length,
        active_pos_valuation: Number(activePOValue.toFixed(2)),
        in_transit_transfers_count: inTransitTransfers.length
      },
      warehouse_breakdown: warehouseMetrics,
      category_breakdown: categoryMetrics,
      recent_alerts: lowStockAlerts.slice(0, 5)
    };
  },

  async getFsnAnalysis() {
    const items = await inventoryService.listItems();
    const stockLevels = await inventoryService.getStockLevels();
    const pos = await purchaseOrderService.listPurchaseOrders();
    const transfers = await transferService.listTransfers();

    // Compute activity / consumption score per item
    return items.map((item) => {
      const itemStock = stockLevels.filter((s) => s.item_id === item.id);
      const totalStock = itemStock.reduce((sum, s) => sum + Number(s.quantity), 0);
      const totalValuation = totalStock * Number(item.unit_price);

      // Quantities moved in transfers
      let transferMovement = 0;
      for (const t of transfers) {
        for (const ti of (t.items || [])) {
          if (ti.item_id === item.id) {
            transferMovement += Number(ti.quantity);
          }
        }
      }

      // Quantities received in POs
      let poMovement = 0;
      for (const p of pos) {
        for (const pi of (p.items || [])) {
          if (pi.item_id === item.id) {
            poMovement += Number(pi.quantity);
          }
        }
      }

      // Movement frequency factor
      const totalMovement = transferMovement + (poMovement * 0.5);
      const turnoverRatio = totalStock > 0 ? (totalMovement / totalStock) : 1.2;

      let fsnCategory = 'S'; // Default Slow
      let recommendation = 'Maintain standard buffer stock; monitor reorder intervals';
      let turnoverScore = 0.5;

      if (turnoverRatio >= 0.8 || totalMovement > 150) {
        fsnCategory = 'F'; // Fast-moving
        recommendation = 'High consumption velocity! Ensure automated reorders and higher safety stock.';
        turnoverScore = Math.min(1.0, 0.75 + (turnoverRatio * 0.2));
      } else if (turnoverRatio < 0.25 || (totalMovement === 0 && totalStock > 50)) {
        fsnCategory = 'N'; // Non-moving
        recommendation = 'Capital stagnant! Halt new purchase orders; evaluate inter-warehouse transfers or clearance.';
        turnoverScore = 0.12;
      } else {
        fsnCategory = 'S'; // Slow-moving
        turnoverScore = 0.48;
      }

      return {
        item_id: item.id,
        sku: item.sku,
        name: item.name,
        category_name: item.category_name,
        unit_price: Number(item.unit_price),
        current_stock: totalStock,
        total_valuation: Number(totalValuation.toFixed(2)),
        fsn_category: fsnCategory, // 'F', 'S', 'N'
        turnover_score: Number(turnoverScore.toFixed(2)),
        monthly_movement_units: totalMovement,
        recommendation
      };
    }).sort((a, b) => {
      const order = { F: 1, S: 2, N: 3 };
      return order[a.fsn_category] - order[b.fsn_category];
    });
  },

  async getStockAuditReport() {
    const stockLevels = await inventoryService.getStockLevels();
    return stockLevels.map((s) => ({
      warehouse: s.warehouse_name,
      warehouse_code: s.warehouse_code,
      sku: s.sku,
      item_name: s.item_name,
      quantity_on_hand: Number(s.quantity),
      unit_of_measure: s.unit_of_measure,
      unit_price: Number(s.unit_price),
      total_asset_value: Number((Number(s.quantity) * Number(s.unit_price)).toFixed(2)),
      threshold: Number(s.minimum_stock_level),
      status: s.is_low_stock ? 'UNDER_MINIMUM' : 'OPTIMAL'
    }));
  }
};
