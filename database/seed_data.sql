-- Seed Data for ISMS
-- Initial test dataset for Development & Demo

USE isms_db;

-- 1. Baseline Users
INSERT INTO users (id, full_name, email, password_hash, role, is_active) VALUES
(1, 'Avani Sharma (Admin)', 'admin@isms.local', '$2a$10$wTqKj1vO.z5U/yAepN4/U.a8327K4B5s3m9H38S9fH4938.q8m3.y', 'ADMIN', 1),
(2, 'Marcus Vance (Manager)', 'manager@isms.local', '$2a$10$wTqKj1vO.z5U/yAepN4/U.a8327K4B5s3m9H38S9fH4938.q8m3.y', 'MANAGER', 1),
(3, 'Sarah Lin (Operator)', 'operator@isms.local', '$2a$10$wTqKj1vO.z5U/yAepN4/U.a8327K4B5s3m9H38S9fH4938.q8m3.y', 'OPERATOR', 1)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- 2. Warehouses
INSERT INTO warehouses (id, warehouse_code, name, address, is_active) VALUES
(1, 'WH-MAIN', 'Central Distribution Hub', '100 Industrial Parkway, Sector 4, Silicon Valley', 1),
(2, 'WH-WEST', 'West Coast Logistics Center', '450 Harbor Boulevard, Dock 12, Long Beach', 1),
(3, 'WH-EAST', 'Metro Express Depot', '88 Eastern Gateway, Unit 3B, New York', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3. Categories
INSERT INTO categories (id, name, description) VALUES
(1, 'Microcontrollers & ICs', 'Silicon microprocessors, MCUs, and integrated circuits'),
(2, 'Sensors & Modules', 'Environmental, inertial, and optical sensor modules'),
(3, 'Power & Batteries', 'Power supplies, Li-ion battery packs, and regulators'),
(4, 'Enclosures & Hardware', 'Chassis, aluminum enclosures, and mounting hardware')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 4. Items
INSERT INTO items (id, sku, name, description, category_id, unit_price, unit_of_measure, minimum_stock_level, is_active) VALUES
(1, 'MCU-ESP32-S3', 'ESP32-S3 Dual-Core SoC Module', 'Wi-Fi + BLE 5.0 microcontroller with AI acceleration', 1, 4.85, 'pcs', 150.000, 1),
(2, 'MCU-RP2040', 'RP2040 Dual ARM Cortex-M0+', 'Dual-core 133MHz flexible microcontroller with PIO', 1, 1.45, 'pcs', 250.000, 1),
(3, 'SNS-BME688', 'BME688 Gas & Humidity Sensor', 'Digital 4-in-1 sensor with artificial intelligence for VOC', 2, 18.20, 'pcs', 80.000, 1),
(4, 'SNS-IMU-6DOF', 'LSM6DSOX 6-DoF IMU Accelerometer', 'Ultra-low power embedded Machine Learning Core IMU', 2, 9.75, 'pcs', 100.000, 1),
(5, 'PWR-LIPO-2000', '3.7V 2000mAh LiPo Battery Pack', 'Rechargeable polymer lithium-ion cell with PCM circuit', 3, 8.50, 'pcs', 120.000, 1),
(6, 'PWR-BUCK-5V3A', 'High-Efficiency Step-Down Buck 5V 3A', 'Synchronous DC-DC step-down buck power regulator', 3, 3.20, 'pcs', 180.000, 1),
(7, 'ENC-ALUM-100', 'Extruded Aluminum Enclosure 100x65mm', 'Anodized aluminum alloy housing for PCB mounting', 4, 14.00, 'pcs', 60.000, 1),
(8, 'ENC-WATERPROOF', 'IP67 Weatherproof Junction Enclosure', 'Polycarbonate outdoor enclosure with silicone gasket', 4, 22.50, 'pcs', 50.000, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), unit_price = VALUES(unit_price);

-- 5. Stock Levels (with intentional low stock for alerts!)
INSERT INTO stock_levels (id, item_id, warehouse_id, quantity) VALUES
(1, 1, 1, 45.000),   -- ESP32-S3: 45 in WH1 (Threshold: 150 -> LOW STOCK!)
(2, 1, 2, 180.000),  -- ESP32-S3: 180 in WH2 (Normal)
(3, 2, 1, 420.000),  -- RP2040: 420 in WH1 (Normal)
(4, 2, 3, 95.000),   -- RP2040: 95 in WH3 (Threshold: 250 -> LOW STOCK!)
(5, 3, 1, 30.000),   -- BME688: 30 in WH1 (Threshold: 80 -> LOW STOCK!)
(6, 3, 2, 110.000),  -- BME688: 110 in WH2 (Normal)
(7, 4, 1, 15.000),   -- LSM6DSOX: 15 in WH1 (Threshold: 100 -> CRITICAL LOW!)
(8, 5, 2, 65.000),   -- LiPo Battery: 65 in WH2 (Threshold: 120 -> LOW STOCK!)
(9, 6, 1, 240.000),  -- Buck Regulator: 240 in WH1 (Normal)
(10, 7, 3, 25.000),  -- Enclosure: 25 in WH3 (Threshold: 60 -> LOW STOCK!)
(11, 8, 1, 75.000)   -- Weatherproof: 75 in WH1 (Normal)
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

-- 6. Suppliers (Developer 2 Scope)
INSERT INTO suppliers (id, name, contact_name, email, phone, address, rating, is_active) VALUES
(1, 'Global Silicon Dynamics', 'Elena Rostov', 'orders@globalsilicondynamics.com', '+1 (408) 555-0192', '740 Microchip Parkway, San Jose, CA', 4.9, 1),
(2, 'Apex Sensor Systems Ltd', 'Kenji Takahashi', 'sales@apexsensors.io', '+1 (650) 555-8321', '12 Innovation Way, Tokyo Tech Hub', 4.8, 1),
(3, 'Voltaic Energy Solutions', 'David Miller', 'b2b@voltaic-energy.com', '+1 (312) 555-4920', '88 Battery Drive, Chicago, IL', 4.7, 1),
(4, 'Precision Enclosures Corp', 'Sophie Dubois', 'supply@precisionenclosures.com', '+1 (512) 555-3104', '500 Fabrication Blvd, Austin, TX', 4.6, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 7. Purchase Orders (Developer 2 Scope)
INSERT INTO purchase_orders (id, po_number, supplier_id, destination_warehouse_id, status, total_amount, expected_delivery_date, notes, created_by, approved_by) VALUES
(1, 'PO-2026-001', 1, 1, 'RECEIVED', 2425.00, '2026-10-10', 'Emergency restock for production line A', 1, 1),
(2, 'PO-2026-002', 2, 1, 'ORDERED', 1820.00, '2026-10-25', 'Quarterly sensor procurement with customs clearance', 2, 1),
(3, 'PO-2026-003', 3, 2, 'PENDING_APPROVAL', 1700.00, '2026-10-28', 'LiPo battery replenishment for West Coast Hub', 2, NULL),
(4, 'PO-2026-004', 1, 1, 'DRAFT', 970.00, '2026-11-05', 'Draft reorder triggered by automated threshold alert', 1, NULL)
ON DUPLICATE KEY UPDATE po_number = VALUES(po_number), status = VALUES(status);

-- 8. Purchase Order Items
INSERT INTO po_items (id, purchase_order_id, item_id, quantity, unit_price, received_quantity) VALUES
(1, 1, 1, 500.000, 4.85, 500.000),
(2, 2, 3, 100.000, 18.20, 0.000),
(3, 3, 5, 200.000, 8.50, 0.000),
(4, 4, 1, 200.000, 4.85, 0.000)
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

-- 9. Stock Transfers (Developer 2 Scope)
INSERT INTO stock_transfers (id, transfer_number, source_warehouse_id, destination_warehouse_id, status, notes, requested_by, approved_by, dispatched_at, received_at) VALUES
(1, 'TRF-2026-101', 2, 1, 'RECEIVED', 'Transfer ESP32 units to Central Hub for urgent project assembly', 2, 1, '2026-10-12 10:00:00', '2026-10-14 15:30:00'),
(2, 'TRF-2026-102', 1, 3, 'DISPATCHED', 'Inter-branch rebalance: RP2040 MCUs in transit via Express Freight', 1, 1, '2026-10-15 08:30:00', NULL),
(3, 'TRF-2026-103', 2, 1, 'REQUESTED', 'Requesting BME688 transfer to cover Central Hub deficit', 2, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE transfer_number = VALUES(transfer_number), status = VALUES(status);

-- 10. Transfer Items
INSERT INTO transfer_items (id, transfer_id, item_id, quantity, received_quantity) VALUES
(1, 1, 1, 50.000, 50.000),
(2, 2, 2, 100.000, 0.000),
(3, 3, 3, 30.000, 0.000)
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);
