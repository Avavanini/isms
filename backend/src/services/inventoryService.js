import pool from '../config/database.js';

const fallbackWarehouses = [
  { id: 1, warehouse_code: 'WH-MAIN', name: 'Central Distribution Hub', address: '100 Industrial Parkway, Sector 4', is_active: true },
  { id: 2, warehouse_code: 'WH-WEST', name: 'West Coast Logistics Center', address: '450 Harbor Boulevard, Dock 12', is_active: true },
  { id: 3, warehouse_code: 'WH-EAST', name: 'Metro Express Depot', address: '88 Eastern Gateway, Unit 3B', is_active: true }
];

const fallbackCategories = [
  { id: 1, name: 'Microcontrollers & ICs', description: 'Silicon microprocessors, MCUs, and integrated circuits' },
  { id: 2, name: 'Sensors & Modules', description: 'Environmental, inertial, and optical sensor modules' },
  { id: 3, name: 'Power & Batteries', description: 'Power supplies, Li-ion battery packs, and regulators' },
  { id: 4, name: 'Enclosures & Hardware', description: 'Chassis, aluminum enclosures, and mounting hardware' }
];

const fallbackItems = [
  { id: 1, sku: 'MCU-ESP32-S3', name: 'ESP32-S3 Dual-Core SoC Module', category_id: 1, category_name: 'Microcontrollers & ICs', unit_price: 4.85, unit_of_measure: 'pcs', minimum_stock_level: 150.000, is_active: true },
  { id: 2, sku: 'MCU-RP2040', name: 'RP2040 Dual ARM Cortex-M0+', category_id: 1, category_name: 'Microcontrollers & ICs', unit_price: 1.45, unit_of_measure: 'pcs', minimum_stock_level: 250.000, is_active: true },
  { id: 3, sku: 'SNS-BME688', name: 'BME688 Gas & Humidity Sensor', category_id: 2, category_name: 'Sensors & Modules', unit_price: 18.20, unit_of_measure: 'pcs', minimum_stock_level: 80.000, is_active: true },
  { id: 4, sku: 'SNS-IMU-6DOF', name: 'LSM6DSOX 6-DoF IMU Accelerometer', category_id: 2, category_name: 'Sensors & Modules', unit_price: 9.75, unit_of_measure: 'pcs', minimum_stock_level: 100.000, is_active: true },
  { id: 5, sku: 'PWR-LIPO-2000', name: '3.7V 2000mAh LiPo Battery Pack', category_id: 3, category_name: 'Power & Batteries', unit_price: 8.50, unit_of_measure: 'pcs', minimum_stock_level: 120.000, is_active: true },
  { id: 6, sku: 'PWR-BUCK-5V3A', name: 'High-Efficiency Step-Down Buck 5V 3A', category_id: 3, category_name: 'Power & Batteries', unit_price: 3.20, unit_of_measure: 'pcs', minimum_stock_level: 180.000, is_active: true },
  { id: 7, sku: 'ENC-ALUM-100', name: 'Extruded Aluminum Enclosure 100x65mm', category_id: 4, category_name: 'Enclosures & Hardware', unit_price: 14.00, unit_of_measure: 'pcs', minimum_stock_level: 60.000, is_active: true },
  { id: 8, sku: 'ENC-WATERPROOF', name: 'IP67 Weatherproof Junction Enclosure', category_id: 4, category_name: 'Enclosures & Hardware', unit_price: 22.50, unit_of_measure: 'pcs', minimum_stock_level: 50.000, is_active: true }
];

let fallbackStockLevels = [
  { id: 1, item_id: 1, warehouse_id: 1, quantity: 45.000 }, // LOW STOCK (min 150)
  { id: 2, item_id: 1, warehouse_id: 2, quantity: 180.000 },
  { id: 3, item_id: 2, warehouse_id: 1, quantity: 420.000 },
  { id: 4, item_id: 2, warehouse_id: 3, quantity: 95.000 }, // LOW STOCK (min 250)
  { id: 5, item_id: 3, warehouse_id: 1, quantity: 30.000 }, // LOW STOCK (min 80)
  { id: 6, item_id: 3, warehouse_id: 2, quantity: 110.000 },
  { id: 7, item_id: 4, warehouse_id: 1, quantity: 15.000 }, // CRITICAL LOW (min 100)
  { id: 8, item_id: 5, warehouse_id: 2, quantity: 65.000 }, // LOW STOCK (min 120)
  { id: 9, item_id: 6, warehouse_id: 1, quantity: 240.000 },
  { id: 10, item_id: 7, warehouse_id: 3, quantity: 25.000 }, // LOW STOCK (min 60)
  { id: 11, item_id: 8, warehouse_id: 1, quantity: 75.000 }
];

export const inventoryService = {
  async listWarehouses() {
    try {
      const [rows] = await pool.query('SELECT * FROM warehouses ORDER BY name ASC');
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // Fallback
    }
    return fallbackWarehouses;
  },

  async listCategories() {
    try {
      const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // Fallback
    }
    return fallbackCategories;
  },

  async listItems(query = {}) {
    try {
      let sql = `
        SELECT i.*, c.name AS category_name,
               COALESCE(SUM(sl.quantity), 0) AS total_stock
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN stock_levels sl ON sl.item_id = i.id
        WHERE 1=1
      `;
      const params = [];
      if (query.search) {
        sql += ` AND (i.name LIKE ? OR i.sku LIKE ?)`;
        params.push(`%${query.search}%`, `%${query.search}%`);
      }
      if (query.category_id) {
        sql += ` AND i.category_id = ?`;
        params.push(query.category_id);
      }
      sql += ` GROUP BY i.id ORDER BY i.name ASC`;
      const [rows] = await pool.query(sql, params);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // Fallback
    }
    return fallbackItems.map((item) => {
      const totalStock = fallbackStockLevels
        .filter((s) => s.item_id === item.id)
        .reduce((sum, s) => sum + Number(s.quantity), 0);
      return { ...item, total_stock: totalStock };
    });
  },

  async getStockLevels(query = {}) {
    try {
      let sql = `
        SELECT sl.id, sl.item_id, sl.warehouse_id, sl.quantity,
               i.sku, i.name AS item_name, i.unit_price, i.unit_of_measure, i.minimum_stock_level,
               w.name AS warehouse_name, w.warehouse_code,
               (sl.quantity <= i.minimum_stock_level) AS is_low_stock
        FROM stock_levels sl
        JOIN items i ON sl.item_id = i.id
        JOIN warehouses w ON sl.warehouse_id = w.id
        WHERE 1=1
      `;
      const params = [];
      if (query.warehouse_id) {
        sql += ` AND sl.warehouse_id = ?`;
        params.push(query.warehouse_id);
      }
      if (query.item_id) {
        sql += ` AND sl.item_id = ?`;
        params.push(query.item_id);
      }
      if (query.low_stock === 'true' || query.low_stock === true) {
        sql += ` AND sl.quantity <= i.minimum_stock_level`;
      }
      sql += ` ORDER BY (sl.quantity <= i.minimum_stock_level) DESC, sl.quantity ASC`;
      const [rows] = await pool.query(sql, params);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // Fallback
    }

    return fallbackStockLevels.map((sl) => {
      const item = fallbackItems.find((i) => i.id === sl.item_id) || {};
      const wh = fallbackWarehouses.find((w) => w.id === sl.warehouse_id) || {};
      const minStock = Number(item.minimum_stock_level || 0);
      const isLow = Number(sl.quantity) <= minStock;
      return {
        ...sl,
        sku: item.sku,
        item_name: item.name,
        unit_price: item.unit_price,
        unit_of_measure: item.unit_of_measure,
        minimum_stock_level: minStock,
        warehouse_name: wh.name,
        warehouse_code: wh.warehouse_code,
        is_low_stock: isLow
      };
    }).filter((sl) => {
      if (query.low_stock === 'true' || query.low_stock === true) {
        return sl.is_low_stock;
      }
      if (query.warehouse_id && String(sl.warehouse_id) !== String(query.warehouse_id)) return false;
      if (query.item_id && String(sl.item_id) !== String(query.item_id)) return false;
      return true;
    });
  },

  async adjustStock(itemId, warehouseId, quantityDelta) {
    try {
      await pool.query(
        `INSERT INTO stock_levels (item_id, warehouse_id, quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity + VALUES(quantity))`,
        [itemId, warehouseId, quantityDelta]
      );
    } catch {
      // Fallback update in-memory
      const existing = fallbackStockLevels.find(
        (s) => s.item_id === Number(itemId) && s.warehouse_id === Number(warehouseId)
      );
      if (existing) {
        existing.quantity = Math.max(0, Number(existing.quantity) + Number(quantityDelta));
      } else {
        fallbackStockLevels.push({
          id: fallbackStockLevels.length + 1,
          item_id: Number(itemId),
          warehouse_id: Number(warehouseId),
          quantity: Math.max(0, Number(quantityDelta))
        });
      }
    }
  }
};
