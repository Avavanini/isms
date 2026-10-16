-- Migration: 20261016140000_procurement_and_transfers.sql
-- Developer 2: Procurement, Transfers & Analytics Module
-- Description: Adds suppliers, purchase_orders, po_items, stock_transfers, and transfer_items tables.

USE isms_db;

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  contact_name VARCHAR(150) NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  rating DECIMAL(3, 1) NOT NULL DEFAULT 5.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_suppliers_name (name),
  KEY idx_suppliers_active_name (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  po_number VARCHAR(50) NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  destination_warehouse_id BIGINT UNSIGNED NOT NULL,
  status ENUM('DRAFT', 'PENDING_APPROVAL', 'ORDERED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  expected_delivery_date DATE NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_po_number (po_number),
  KEY idx_po_supplier_id (supplier_id),
  KEY idx_po_destination_warehouse_id (destination_warehouse_id),
  KEY idx_po_status (status),
  KEY idx_po_created_by (created_by),
  CONSTRAINT fk_po_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_po_destination_warehouse
    FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_po_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_po_approved_by
    FOREIGN KEY (approved_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_po_total_amount_nonnegative CHECK (total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Purchase Order Line Items Table
CREATE TABLE IF NOT EXISTS po_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(14, 3) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  received_quantity DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_po_items_po_id (purchase_order_id),
  KEY idx_po_items_item_id (item_id),
  CONSTRAINT fk_po_items_po
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_po_items_item
    FOREIGN KEY (item_id) REFERENCES items (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_po_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_po_items_unit_price_nonnegative CHECK (unit_price >= 0),
  CONSTRAINT chk_po_items_received_quantity_nonnegative CHECK (received_quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Inter-Warehouse Stock Transfers Table
CREATE TABLE IF NOT EXISTS stock_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transfer_number VARCHAR(50) NOT NULL,
  source_warehouse_id BIGINT UNSIGNED NOT NULL,
  destination_warehouse_id BIGINT UNSIGNED NOT NULL,
  status ENUM('REQUESTED', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
  notes TEXT NULL,
  requested_by BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  dispatched_at TIMESTAMP NULL,
  received_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transfer_number (transfer_number),
  KEY idx_transfers_source (source_warehouse_id),
  KEY idx_transfers_dest (destination_warehouse_id),
  KEY idx_transfers_status (status),
  CONSTRAINT fk_transfers_source_wh
    FOREIGN KEY (source_warehouse_id) REFERENCES warehouses (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_transfers_dest_wh
    FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_transfers_requested_by
    FOREIGN KEY (requested_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_transfers_approved_by
    FOREIGN KEY (approved_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_transfers_different_warehouses CHECK (source_warehouse_id != destination_warehouse_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Stock Transfer Line Items Table
CREATE TABLE IF NOT EXISTS transfer_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transfer_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(14, 3) NOT NULL,
  received_quantity DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transfer_items_transfer_id (transfer_id),
  KEY idx_transfer_items_item_id (item_id),
  CONSTRAINT fk_transfer_items_transfer
    FOREIGN KEY (transfer_id) REFERENCES stock_transfers (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_transfer_items_item
    FOREIGN KEY (item_id) REFERENCES items (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_transfer_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_transfer_items_received_quantity_nonnegative CHECK (received_quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
