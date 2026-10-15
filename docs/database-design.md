# Database design

The baseline schema in `database/schema.sql` contains users, warehouses,
categories, items, and per-warehouse stock levels. Identifiers use unsigned
big integers; quantities and prices use fixed-precision decimals. Foreign keys
and non-negative checks protect stock and item values. Items may outlive a
deleted category (`ON DELETE SET NULL`); stock records restrict deletion of
referenced items and warehouses.

Developer A owns users and roles, audit logs, items and categories, warehouses,
stock levels, and stock-in/stock-out transactions. Developer B owns suppliers,
purchase orders and lines, transfers and lines, procurement, analytics, and
reporting. Discuss and document any cross-owner relationship before introducing
it.

Use snake_case, InnoDB, `utf8mb4`, `created_at`/`updated_at`, indexed foreign
keys, soft-deactivation for master data, and parameterized SQL. Keep the
baseline stable: add changes through ordered, reviewed, forward-only SQL
migrations under `database/migrations/`, never by dropping shared tables.
See [database setup conventions](../database/README.md).


## Phase 3 stock transaction contract

Migration `20261015130000_stock_transactions.sql` adds append-only operational
history linked to items, warehouses, and the acting user. Quantity values use
`DECIMAL(14,3)`, matching existing `stock_levels`; prices stay `DECIMAL(12,2)`.
The item-level `minimum_stock_level` is the shared reorder threshold; compare it
against every warehouse's balance. Stock levels are only changed by the stock
movement service, which records exact before/after values under a transaction.
Developer B can use the low-stock stock-level endpoint as the reorder input.
