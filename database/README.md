# Database setup and change conventions

Run `schema.sql` once against a clean MySQL 8.0+ server to create the shared
`isms_db` baseline. The script creates the database when needed and uses
`CREATE TABLE IF NOT EXISTS`; it is intended for initial setup, not to mutate
an existing table definition.

## Safe schema evolution

Never drop or recreate shared tables to apply a change. Add an ordered,
forward-only migration under `migrations/`, for example
`20261015120000_add_audit_logs.sql`. Apply each migration once, in order, and
record its filename and completion time in a `schema_migrations` table managed
by the migration runner or the applying developer. Review migrations with both
developers before applying them to a shared database. Back up the database
before any production migration and test changes against a disposable database
first.

## Shared schema contract

- Use InnoDB, `utf8mb4`, snake_case names, primary keys named `id`, and UTC
  timestamps named `created_at` and `updated_at`.
- Use `BIGINT UNSIGNED` for identifiers and foreign keys; add an index for each
  foreign key. Prefer restrictive deletes for operational records and
  soft-deactivation (`is_active`) for master data.
- Use `DECIMAL` for prices and quantities; enforce non-negative values in both
  application validation and the database.
- Use parameterized SQL via `mysql2/promise`; do not build queries by
  concatenating request values.
- Use `database/schema.sql` only for the initial baseline. New module tables or
  columns belong in versioned migrations; do not edit a migration that may
  already have been applied.
- Developer A owns users, roles, audit logs, catalog, warehouses, stock levels,
  and stock transactions. Developer B owns suppliers, purchase orders,
  transfers, procurement, analytics, and reporting. Agree on table names,
  foreign keys, and any cross-module contract before either side adds tables.
- Keep supplier, purchasing, transfer, and reporting tables out of the Phase 1
  baseline. Developer A may add `audit_logs` and `stock_transactions` later
  through non-destructive migrations.

Phase 2 adds session and audit tables without changing existing user rows or constraints. Runtime database credentials should have SELECT/INSERT access to `audit_logs`, without UPDATE or DELETE; grants are deployment-specific and are intentionally not embedded in the migration.
