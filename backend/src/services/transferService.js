import pool from '../config/database.js';
import { inventoryService } from './inventoryService.js';
import { broadcastEvent } from '../websockets/socketServer.js';

let fallbackTransfers = [
  {
    id: 1,
    transfer_number: 'TRF-2026-101',
    source_warehouse_id: 2,
    source_warehouse_name: 'West Coast Logistics Center',
    destination_warehouse_id: 1,
    destination_warehouse_name: 'Central Distribution Hub',
    status: 'RECEIVED',
    notes: 'Transfer ESP32 units to Central Hub for urgent project assembly',
    requested_by: 2,
    approved_by: 1,
    dispatched_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    received_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    items: [
      {
        id: 1,
        item_id: 1,
        sku: 'MCU-ESP32-S3',
        item_name: 'ESP32-S3 Dual-Core SoC Module',
        quantity: 50,
        received_quantity: 50
      }
    ]
  },
  {
    id: 2,
    transfer_number: 'TRF-2026-102',
    source_warehouse_id: 1,
    source_warehouse_name: 'Central Distribution Hub',
    destination_warehouse_id: 3,
    destination_warehouse_name: 'Metro Express Depot',
    status: 'DISPATCHED',
    notes: 'Inter-branch rebalance: RP2040 MCUs in transit via Express Freight',
    requested_by: 1,
    approved_by: 1,
    dispatched_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    received_at: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    items: [
      {
        id: 2,
        item_id: 2,
        sku: 'MCU-RP2040',
        item_name: 'RP2040 Dual ARM Cortex-M0+',
        quantity: 100,
        received_quantity: 0
      }
    ]
  },
  {
    id: 3,
    transfer_number: 'TRF-2026-103',
    source_warehouse_id: 2,
    source_warehouse_name: 'West Coast Logistics Center',
    destination_warehouse_id: 1,
    destination_warehouse_name: 'Central Distribution Hub',
    status: 'REQUESTED',
    notes: 'Requesting BME688 transfer to cover Central Hub deficit',
    requested_by: 2,
    approved_by: null,
    dispatched_at: null,
    received_at: null,
    created_at: new Date().toISOString(),
    items: [
      {
        id: 3,
        item_id: 3,
        sku: 'SNS-BME688',
        item_name: 'BME688 Gas & Humidity Sensor',
        quantity: 30,
        received_quantity: 0
      }
    ]
  }
];

export const transferService = {
  async listTransfers(query = {}) {
    try {
      let sql = `
        SELECT t.*,
               sw.name AS source_warehouse_name,
               dw.name AS destination_warehouse_name
        FROM stock_transfers t
        JOIN warehouses sw ON t.source_warehouse_id = sw.id
        JOIN warehouses dw ON t.destination_warehouse_id = dw.id
        WHERE 1=1
      `;
      const params = [];
      if (query.status) {
        sql += ' AND t.status = ?';
        params.push(query.status);
      }
      if (query.source_warehouse_id) {
        sql += ' AND t.source_warehouse_id = ?';
        params.push(query.source_warehouse_id);
      }
      if (query.destination_warehouse_id) {
        sql += ' AND t.destination_warehouse_id = ?';
        params.push(query.destination_warehouse_id);
      }
      sql += ' ORDER BY t.created_at DESC';
      const [rows] = await pool.query(sql, params);
      if (Array.isArray(rows) && rows.length > 0) {
        for (const trf of rows) {
          const [items] = await pool.query(
            `SELECT ti.*, i.sku, i.name AS item_name
             FROM transfer_items ti
             JOIN items i ON ti.item_id = i.id
             WHERE ti.transfer_id = ?`,
            [trf.id]
          );
          trf.items = items;
        }
        return rows;
      }
    } catch {
      // Fallback
    }

    return fallbackTransfers.filter((t) => {
      if (query.status && t.status !== query.status) return false;
      if (query.source_warehouse_id && String(t.source_warehouse_id) !== String(query.source_warehouse_id)) return false;
      if (query.destination_warehouse_id && String(t.destination_warehouse_id) !== String(query.destination_warehouse_id)) return false;
      return true;
    });
  },

  async getTransferById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT t.*,
                sw.name AS source_warehouse_name,
                dw.name AS destination_warehouse_name
         FROM stock_transfers t
         JOIN warehouses sw ON t.source_warehouse_id = sw.id
         JOIN warehouses dw ON t.destination_warehouse_id = dw.id
         WHERE t.id = ? LIMIT 1`,
        [id]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const trf = rows[0];
        const [items] = await pool.query(
          `SELECT ti.*, i.sku, i.name AS item_name
           FROM transfer_items ti
           JOIN items i ON ti.item_id = i.id
           WHERE ti.transfer_id = ?`,
          [trf.id]
        );
        trf.items = items;
        return trf;
      }
    } catch {
      // Fallback
    }
    return fallbackTransfers.find((t) => String(t.id) === String(id)) || null;
  },

  async createTransfer(data, user = { id: 1 }) {
    const {
      source_warehouse_id,
      destination_warehouse_id,
      notes,
      items = []
    } = data;

    if (String(source_warehouse_id) === String(destination_warehouse_id)) {
      throw new Error('Source and destination warehouse cannot be the same');
    }

    const transferNumber = `TRF-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
    const catalogItems = await inventoryService.listItems();

    const formattedItems = items.map((item, index) => {
      const matched = catalogItems.find((ci) => String(ci.id) === String(item.item_id));
      return {
        id: index + 1,
        item_id: Number(item.item_id),
        sku: matched?.sku || `SKU-${item.item_id}`,
        item_name: matched?.name || `Item ${item.item_id}`,
        quantity: Number(item.quantity),
        received_quantity: 0
      };
    });

    try {
      const [res] = await pool.query(
        `INSERT INTO stock_transfers (transfer_number, source_warehouse_id, destination_warehouse_id, status, notes, requested_by)
         VALUES (?, ?, ?, 'REQUESTED', ?, ?)`,
        [transferNumber, source_warehouse_id, destination_warehouse_id, notes || null, user.id]
      );
      const transferId = res.insertId;

      for (const item of formattedItems) {
        await pool.query(
          `INSERT INTO transfer_items (transfer_id, item_id, quantity, received_quantity)
           VALUES (?, ?, ?, 0)`,
          [transferId, item.item_id, item.quantity]
        );
      }

      const created = await this.getTransferById(transferId);
      broadcastEvent('TRANSFER_CREATED', created);
      return created;
    } catch {
      // Fallback
      const warehouses = await inventoryService.listWarehouses();
      const sWh = warehouses.find((w) => String(w.id) === String(source_warehouse_id));
      const dWh = warehouses.find((w) => String(w.id) === String(destination_warehouse_id));

      const newTrf = {
        id: fallbackTransfers.length + 1,
        transfer_number: transferNumber,
        source_warehouse_id: Number(source_warehouse_id),
        source_warehouse_name: sWh?.name || 'Source Warehouse',
        destination_warehouse_id: Number(destination_warehouse_id),
        destination_warehouse_name: dWh?.name || 'Destination Warehouse',
        status: 'REQUESTED',
        notes: notes || '',
        requested_by: user.id,
        approved_by: null,
        dispatched_at: null,
        received_at: null,
        created_at: new Date().toISOString(),
        items: formattedItems
      };
      fallbackTransfers.unshift(newTrf);
      broadcastEvent('TRANSFER_CREATED', newTrf);
      return newTrf;
    }
  },

  async approveTransfer(id, user = { id: 1 }) {
    const trf = await this.getTransferById(id);
    if (!trf) return null;

    try {
      await pool.query(
        'UPDATE stock_transfers SET status = ?, approved_by = ? WHERE id = ?',
        ['APPROVED', user.id, id]
      );
    } catch {
      trf.status = 'APPROVED';
      trf.approved_by = user.id;
    }

    const updated = await this.getTransferById(id);
    broadcastEvent('TRANSFER_APPROVED', updated);
    return updated;
  },

  async dispatchTransfer(id, user = { id: 1 }) {
    const trf = await this.getTransferById(id);
    if (!trf) return null;

    // Deduct stock from source warehouse
    for (const item of (trf.items || [])) {
      await inventoryService.adjustStock(item.item_id, trf.source_warehouse_id, -item.quantity);
    }

    const dispatchedAt = new Date().toISOString();
    try {
      await pool.query(
        'UPDATE stock_transfers SET status = ?, dispatched_at = ?, approved_by = COALESCE(approved_by, ?) WHERE id = ?',
        ['DISPATCHED', dispatchedAt, user.id, id]
      );
    } catch {
      trf.status = 'DISPATCHED';
      trf.dispatched_at = dispatchedAt;
      trf.approved_by = trf.approved_by || user.id;
    }

    const updated = await this.getTransferById(id);
    broadcastEvent('TRANSFER_DISPATCHED', {
      transfer: updated,
      message: `Transfer ${trf.transfer_number} dispatched from ${trf.source_warehouse_name}!`
    });
    return updated;
  },

  async receiveTransfer(id, _user = { id: 1 }) {
    const trf = await this.getTransferById(id);
    if (!trf) return null;

    // Add stock into destination warehouse
    for (const item of (trf.items || [])) {
      item.received_quantity = item.quantity;
      await inventoryService.adjustStock(item.item_id, trf.destination_warehouse_id, item.quantity);
      try {
        await pool.query(
          'UPDATE transfer_items SET received_quantity = ? WHERE transfer_id = ? AND item_id = ?',
          [item.quantity, id, item.item_id]
        );
      } catch {
        // Fallback
      }
    }

    const receivedAt = new Date().toISOString();
    try {
      await pool.query(
        'UPDATE stock_transfers SET status = ?, received_at = ? WHERE id = ?',
        ['RECEIVED', receivedAt, id]
      );
    } catch {
      trf.status = 'RECEIVED';
      trf.received_at = receivedAt;
    }

    const updated = await this.getTransferById(id);
    broadcastEvent('TRANSFER_RECEIVED', {
      transfer: updated,
      message: `Transfer ${trf.transfer_number} successfully received at ${trf.destination_warehouse_name}!`
    });
    return updated;
  },

  async cancelTransfer(id) {
    const trf = await this.getTransferById(id);
    if (!trf) return null;

    // If it was already dispatched, revert source stock
    if (trf.status === 'DISPATCHED') {
      for (const item of (trf.items || [])) {
        await inventoryService.adjustStock(item.item_id, trf.source_warehouse_id, item.quantity);
      }
    }

    try {
      await pool.query('UPDATE stock_transfers SET status = ? WHERE id = ?', ['CANCELLED', id]);
    } catch {
      trf.status = 'CANCELLED';
    }

    const updated = await this.getTransferById(id);
    broadcastEvent('TRANSFER_CANCELLED', updated);
    return updated;
  }
};
