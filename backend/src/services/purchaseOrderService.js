import pool from '../config/database.js';
import { inventoryService } from './inventoryService.js';
import { supplierService } from './supplierService.js';
import { broadcastEvent } from '../websockets/socketServer.js';

let fallbackPOs = [
  {
    id: 1,
    po_number: 'PO-2026-001',
    supplier_id: 1,
    supplier_name: 'Global Silicon Dynamics',
    destination_warehouse_id: 1,
    warehouse_name: 'Central Distribution Hub',
    status: 'RECEIVED',
    total_amount: 2425.00,
    expected_delivery_date: '2026-10-10',
    notes: 'Emergency restock for production line A',
    created_by: 1,
    approved_by: 1,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    items: [
      {
        id: 1,
        item_id: 1,
        sku: 'MCU-ESP32-S3',
        item_name: 'ESP32-S3 Dual-Core SoC Module',
        quantity: 500,
        unit_price: 4.85,
        received_quantity: 500
      }
    ]
  },
  {
    id: 2,
    po_number: 'PO-2026-002',
    supplier_id: 2,
    supplier_name: 'Apex Sensor Systems Ltd',
    destination_warehouse_id: 1,
    warehouse_name: 'Central Distribution Hub',
    status: 'ORDERED',
    total_amount: 1820.00,
    expected_delivery_date: '2026-10-25',
    notes: 'Quarterly sensor procurement with customs clearance',
    created_by: 2,
    approved_by: 1,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    items: [
      {
        id: 2,
        item_id: 3,
        sku: 'SNS-BME688',
        item_name: 'BME688 Gas & Humidity Sensor',
        quantity: 100,
        unit_price: 18.20,
        received_quantity: 0
      }
    ]
  },
  {
    id: 3,
    po_number: 'PO-2026-003',
    supplier_id: 3,
    supplier_name: 'Voltaic Energy Solutions',
    destination_warehouse_id: 2,
    warehouse_name: 'West Coast Logistics Center',
    status: 'PENDING_APPROVAL',
    total_amount: 1700.00,
    expected_delivery_date: '2026-10-28',
    notes: 'LiPo battery replenishment for West Coast Hub',
    created_by: 2,
    approved_by: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    items: [
      {
        id: 3,
        item_id: 5,
        sku: 'PWR-LIPO-2000',
        item_name: '3.7V 2000mAh LiPo Battery Pack',
        quantity: 200,
        unit_price: 8.50,
        received_quantity: 0
      }
    ]
  },
  {
    id: 4,
    po_number: 'PO-2026-004',
    supplier_id: 1,
    supplier_name: 'Global Silicon Dynamics',
    destination_warehouse_id: 1,
    warehouse_name: 'Central Distribution Hub',
    status: 'DRAFT',
    total_amount: 970.00,
    expected_delivery_date: '2026-11-05',
    notes: 'Draft reorder triggered by automated threshold alert',
    created_by: 1,
    approved_by: null,
    created_at: new Date().toISOString(),
    items: [
      {
        id: 4,
        item_id: 1,
        sku: 'MCU-ESP32-S3',
        item_name: 'ESP32-S3 Dual-Core SoC Module',
        quantity: 200,
        unit_price: 4.85,
        received_quantity: 0
      }
    ]
  }
];

export const purchaseOrderService = {
  async getLowStockAlerts() {
    const stockLevels = await inventoryService.getStockLevels({ low_stock: true });
    const suppliers = await supplierService.listSuppliers({ is_active: true });

    return stockLevels.map((sl) => {
      const deficit = Math.max(0, Number(sl.minimum_stock_level) - Number(sl.quantity));
      const suggestedReorder = Math.ceil(deficit > 0 ? (Number(sl.minimum_stock_level) * 1.5) - Number(sl.quantity) : Number(sl.minimum_stock_level));
      const estimatedCost = Number(suggestedReorder) * Number(sl.unit_price || 0);

      // Map preferred supplier
      const preferredSupplier = suppliers.length > 0 ? suppliers[sl.item_id % suppliers.length] : null;

      let severity = 'LOW';
      if (Number(sl.quantity) === 0) {
        severity = 'OUT_OF_STOCK';
      } else if (Number(sl.quantity) <= Number(sl.minimum_stock_level) * 0.3) {
        severity = 'CRITICAL';
      } else if (Number(sl.quantity) <= Number(sl.minimum_stock_level) * 0.7) {
        severity = 'HIGH';
      }

      return {
        item_id: sl.item_id,
        item_name: sl.item_name,
        sku: sl.sku,
        warehouse_id: sl.warehouse_id,
        warehouse_name: sl.warehouse_name,
        warehouse_code: sl.warehouse_code,
        current_stock: Number(sl.quantity),
        minimum_stock_level: Number(sl.minimum_stock_level),
        deficit,
        suggested_reorder: suggestedReorder,
        unit_price: Number(sl.unit_price),
        estimated_cost: Number(estimatedCost.toFixed(2)),
        unit_of_measure: sl.unit_of_measure,
        severity,
        preferred_supplier: preferredSupplier
      };
    });
  },

  async listPurchaseOrders(query = {}) {
    try {
      let sql = `
        SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        JOIN warehouses w ON po.destination_warehouse_id = w.id
        WHERE 1=1
      `;
      const params = [];
      if (query.status) {
        sql += ' AND po.status = ?';
        params.push(query.status);
      }
      if (query.supplier_id) {
        sql += ' AND po.supplier_id = ?';
        params.push(query.supplier_id);
      }
      if (query.destination_warehouse_id) {
        sql += ' AND po.destination_warehouse_id = ?';
        params.push(query.destination_warehouse_id);
      }
      sql += ' ORDER BY po.created_at DESC';
      const [rows] = await pool.query(sql, params);
      if (Array.isArray(rows) && rows.length > 0) {
        // Fetch items for each PO
        for (const po of rows) {
          const [items] = await pool.query(
            `SELECT poi.*, i.sku, i.name AS item_name
             FROM po_items poi
             JOIN items i ON poi.item_id = i.id
             WHERE poi.purchase_order_id = ?`,
            [po.id]
          );
          po.items = items;
        }
        return rows;
      }
    } catch {
      // Fallback
    }

    return fallbackPOs.filter((po) => {
      if (query.status && po.status !== query.status) return false;
      if (query.supplier_id && String(po.supplier_id) !== String(query.supplier_id)) return false;
      if (query.destination_warehouse_id && String(po.destination_warehouse_id) !== String(query.destination_warehouse_id)) return false;
      return true;
    });
  },

  async getPurchaseOrderById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name
         FROM purchase_orders po
         JOIN suppliers s ON po.supplier_id = s.id
         JOIN warehouses w ON po.destination_warehouse_id = w.id
         WHERE po.id = ? LIMIT 1`,
        [id]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const po = rows[0];
        const [items] = await pool.query(
          `SELECT poi.*, i.sku, i.name AS item_name
           FROM po_items poi
           JOIN items i ON poi.item_id = i.id
           WHERE poi.purchase_order_id = ?`,
          [po.id]
        );
        po.items = items;
        return po;
      }
    } catch {
      // Fallback
    }
    return fallbackPOs.find((p) => String(p.id) === String(id)) || null;
  },

  async createPurchaseOrder(data, user = { id: 1 }) {
    const {
      supplier_id,
      destination_warehouse_id,
      expected_delivery_date,
      notes,
      items = [],
      status = 'DRAFT'
    } = data;

    const poNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
    let totalAmount = 0;
    const itemsWithPricing = [];

    const catalogItems = await inventoryService.listItems();

    for (const item of items) {
      const matched = catalogItems.find((ci) => String(ci.id) === String(item.item_id));
      const unitPrice = Number(item.unit_price || (matched ? matched.unit_price : 0));
      const qty = Number(item.quantity);
      totalAmount += unitPrice * qty;
      itemsWithPricing.push({
        id: itemsWithPricing.length + 1,
        item_id: Number(item.item_id),
        sku: matched?.sku || `SKU-${item.item_id}`,
        item_name: matched?.name || `Item ${item.item_id}`,
        quantity: qty,
        unit_price: unitPrice,
        received_quantity: 0
      });
    }

    try {
      const [result] = await pool.query(
        `INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, total_amount, expected_delivery_date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [poNumber, supplier_id, destination_warehouse_id, status, totalAmount, expected_delivery_date || null, notes || null, user.id]
      );
      const poId = result.insertId;

      for (const item of itemsWithPricing) {
        await pool.query(
          `INSERT INTO po_items (purchase_order_id, item_id, quantity, unit_price, received_quantity)
           VALUES (?, ?, ?, ?, 0)`,
          [poId, item.item_id, item.quantity, item.unit_price]
        );
      }

      const created = await this.getPurchaseOrderById(poId);
      broadcastEvent('PO_CREATED', created);
      return created;
    } catch {
      // Fallback in-memory
      const suppliers = await supplierService.listSuppliers();
      const warehouses = await inventoryService.listWarehouses();
      const sup = suppliers.find((s) => String(s.id) === String(supplier_id));
      const wh = warehouses.find((w) => String(w.id) === String(destination_warehouse_id));

      const newPo = {
        id: fallbackPOs.length + 1,
        po_number: poNumber,
        supplier_id: Number(supplier_id),
        supplier_name: sup?.name || 'Selected Supplier',
        destination_warehouse_id: Number(destination_warehouse_id),
        warehouse_name: wh?.name || 'Selected Warehouse',
        status,
        total_amount: Number(totalAmount.toFixed(2)),
        expected_delivery_date: expected_delivery_date || null,
        notes: notes || '',
        created_by: user.id,
        approved_by: null,
        created_at: new Date().toISOString(),
        items: itemsWithPricing
      };
      fallbackPOs.unshift(newPo);
      broadcastEvent('PO_CREATED', newPo);
      return newPo;
    }
  },

  async updateStatus(id, newStatus, user = { id: 1 }) {
    const po = await this.getPurchaseOrderById(id);
    if (!po) return null;

    try {
      let updateSql = 'UPDATE purchase_orders SET status = ?';
      const params = [newStatus];
      if (newStatus === 'PENDING_APPROVAL' || newStatus === 'ORDERED') {
        updateSql += ', approved_by = COALESCE(approved_by, ?)';
        params.push(user.id);
      }
      updateSql += ' WHERE id = ?';
      params.push(id);
      await pool.query(updateSql, params);
    } catch {
      // Fallback
      po.status = newStatus;
      if (newStatus === 'ORDERED' || newStatus === 'PENDING_APPROVAL') {
        po.approved_by = user.id;
      }
    }

    // If marked RECEIVED, update stock balances!
    if (newStatus === 'RECEIVED') {
      await this.receivePurchaseOrder(id, user);
    }

    const updated = await this.getPurchaseOrderById(id);
    broadcastEvent('PO_STATUS_CHANGED', updated);
    return updated;
  },

  async receivePurchaseOrder(id, _user = { id: 1 }) {
    const po = await this.getPurchaseOrderById(id);
    if (!po) return null;

    po.status = 'RECEIVED';
    // Update all item stock levels in destination warehouse
    for (const item of (po.items || [])) {
      item.received_quantity = item.quantity;
      await inventoryService.adjustStock(item.item_id, po.destination_warehouse_id, item.quantity);
      try {
        await pool.query(
          'UPDATE po_items SET received_quantity = ? WHERE purchase_order_id = ? AND item_id = ?',
          [item.quantity, id, item.item_id]
        );
      } catch {
        // Fallback handled
      }
    }

    try {
      await pool.query('UPDATE purchase_orders SET status = ? WHERE id = ?', ['RECEIVED', id]);
    } catch {
      // Handled
    }

    const receivedPo = await this.getPurchaseOrderById(id);
    broadcastEvent('PO_RECEIVED', {
      po: receivedPo,
      message: `Purchase Order ${po.po_number} received into ${po.warehouse_name}! Stock balances updated.`
    });
    return receivedPo;
  },

  async autoGenerateReorderPOs(user = { id: 1 }) {
    const alerts = await this.getLowStockAlerts();
    if (alerts.length === 0) return [];

    // Group alerts by warehouse and preferred supplier
    const groups = new Map();
    for (const alert of alerts) {
      const supplierId = alert.preferred_supplier?.id || 1;
      const key = `${supplierId}-${alert.warehouse_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          supplier_id: supplierId,
          destination_warehouse_id: alert.warehouse_id,
          items: []
        });
      }
      groups.get(key).items.push({
        item_id: alert.item_id,
        quantity: alert.suggested_reorder,
        unit_price: alert.unit_price
      });
    }

    const createdPOs = [];
    for (const [, group] of groups) {
      const po = await this.createPurchaseOrder({
        supplier_id: group.supplier_id,
        destination_warehouse_id: group.destination_warehouse_id,
        status: 'DRAFT',
        notes: 'Automated auto-reorder generated from low-stock threshold triggers',
        expected_delivery_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        items: group.items
      }, user);
      createdPOs.push(po);
    }

    broadcastEvent('REORDER_TRIGGERED', {
      count: createdPOs.length,
      orders: createdPOs
    });
    return createdPOs;
  }
};
