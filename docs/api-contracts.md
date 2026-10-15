# API contracts

The API is rooted at `/api`, uses JSON, and is served locally on port `3000`.
Successful responses use `{ "success": true, "data": ... }`; errors use
`{ "success": false, "error": { "code": "...", "message": "..." } }`.
Responses do not expose stack traces or internal database error details.

## Health

`GET /api/health` checks the API and its MySQL connection.

Connected response (`200`):

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

When MySQL is unavailable, the route returns `500` with
`INTERNAL_SERVER_ERROR`; internal connection details are logged server-side
only. Unknown routes return `404` with error code `NOT_FOUND`.

## Authentication and sessions

All successful responses use the standard envelope above. A login sets the
HttpOnly `isms_session` cookie and returns the public user record only. The
JWT lasts 15 minutes, uses issuer `isms-api`, audience `isms-web`, and is
backed by a revocable database session. No refresh token is issued.

- `POST /api/auth/register`: accepts `{ "full_name", "email", "password" }`; creates an active OPERATOR account only and returns 201. The role field is not accepted. Duplicate emails return 409.
- `POST /api/auth/login`: accepts `{ "email", "password" }`; 200 on success,
  400 on invalid input, 401 with the same error for unknown, disabled, or
  incorrect credentials. Limited to 10 attempts per IP per 15 minutes.
- `POST /api/auth/logout`: revokes a valid session and clears the cookie.
- `GET /api/auth/me`: returns the authenticated public user; 401 if signed out,
  expired, revoked, or inactive.

Cookie flags are HttpOnly, SameSite=Lax, path `/api`, and Secure is configured
for HTTPS deployments. CORS credentials are limited to `CORS_ORIGIN`. Production
requires HTTPS, a high-entropy `JWT_SECRET` of at least 32 characters, strict
origin configuration, and CSRF protections if using cross-site cookies.

## User administration (ADMIN only)

- `GET /api/users?page=1&limit=20&search=` lists users with pagination.
- `POST /api/users` accepts `full_name`, `email`, `password`, and `role`.
- `GET /api/users/:id` returns one public user record.
- `PATCH /api/users/:id` updates only `full_name` and/or `email`.
- `PATCH /api/users/:id/role` accepts `{ "role": "ADMIN|MANAGER|OPERATOR" }`.
- `PATCH /api/users/:id/activation` accepts `{ "is_active": true|false }`.

Unknown request properties are rejected. Duplicate email responds 409. The last
active administrator cannot be demoted or deactivated. Deactivation revokes
active sessions. No endpoint returns password hashes. Ordinary database runtime
users should receive only INSERT and SELECT grants for `audit_logs`; never
UPDATE or DELETE. Audit metadata must exclude credential or token material.
Database and JWT secrets are configuration values and never appear in API data.


## Inventory, categories, warehouses, and stock (authenticated)

Every endpoint below requires a valid session cookie. ADMIN and MANAGER can
create/update catalog, category, and warehouse records. All three roles can
read inventory and submit stock movements. IDs and query inputs are validated;
item/catalog writes reject unsupported properties.

- `GET /api/items?page=1&limit=20&search=&category_id=&is_active=&sort=name&order=asc`
  lists items. Supported sorting: `name`, `sku`, `price`, `created_at`.
- `POST /api/items` creates an item with `sku`, `name`, optional `description`,
  `category_id`, `unit_price`, `unit_of_measure`, and `minimum_stock_level`.
- `GET /api/items/:id` returns the item and its stock by warehouse.
- `PATCH /api/items/:id` updates permitted item fields, including active status.
  Duplicate SKU returns 409. Referenced items have no delete endpoint.
- `GET/POST /api/categories`, `GET/PATCH/DELETE /api/categories/:id` provide
  category management. A category referenced by items is nulled by the existing
  FK rule when removed.
- `GET /api/warehouses?page=1&limit=20&search=&is_active=` lists warehouses.
- `POST /api/warehouses` creates a warehouse; `GET /api/warehouses/:id` includes
  stock; `PATCH /api/warehouses/:id` updates details or active status. There is
  no delete endpoint so stock and transaction history remain intact.
- `GET /api/stock/levels?page=1&limit=20&item_id=&warehouse_id=&low_stock=true`
  returns quantity, item-wide minimum threshold, and low-stock status.
- `POST /api/stock/in` and `POST /api/stock/out` accept `item_id`,
  `warehouse_id`, positive `quantity` (up to 3 decimals), and optional
  `reference_number` and `notes`. Actor identity comes from the session.
- `GET /api/stock/transactions?page=1&limit=20&item_id=&warehouse_id=&transaction_type=IN|OUT&from=YYYY-MM-DD&to=YYYY-MM-DD`
  returns movement history and actor names.

Stock writes use a database transaction, create-or-lock the unique stock row,
write the before/after history record, update the balance, then commit. Quantities
are calculated in scaled integer thousandths in application code and stored in
`DECIMAL(14,3)`. Stock-out below zero is rejected with 409 and rolls back.
The existing item `minimum_stock_level` is item-wide and compared separately
with each warehouse balance. Developer B can query `GET /api/stock/levels?low_stock=true`
for reorder candidates; this does not create purchase orders.
