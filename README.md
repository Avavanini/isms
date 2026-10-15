# Inventory and Stock Management System (ISMS)

ISMS is a web-based inventory and stock management foundation for
multiple-warehouse operations. It uses React and Vite in the browser, a
Node.js/Express JSON REST API, and MySQL accessed through `mysql2/promise`.
Authentication and administrator user management are implemented in Phase 2.
Inventory business workflows remain planned for a later phase.

## Prerequisites

- Node.js 20.19+ or 22.12+ (Node.js 25 is also expected to work) and npm 10+
- MySQL Server 8.0+
- Git

## Repository structure

```text
frontend/   React/Vite user interface, Router, Axios client, Vitest tests
backend/    Express API, layered modules, MySQL pool, Node test suite
database/   Reproducible baseline schema, migrations, seeds, conventions
docs/       Architecture, database design, and API contracts
```

## Database setup

1. Start MySQL Server 8.0 and create a local database user with permission to
   create/use `isms_db` (or use a suitably privileged local development user).
2. From the repository root, execute the baseline SQL:

   ```sh
   mysql -u YOUR_MYSQL_USER -p < database/schema.sql
   ```

   The script creates and selects `isms_db`. The schema is for a clean initial
   install; do not use it to replace or destructively reset an existing schema.
   In PowerShell, you can run the SQL through standard input with:

   ```powershell
   Get-Content -Raw database\schema.sql | mysql -u YOUR_MYSQL_USER -p
   ```
3. Copy the root and backend environment templates to local `.env` files and
   enter the same MySQL connection settings in both. For example, in PowerShell:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item backend\.env.example backend\.env
   ```

   Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in
   `backend/.env`. The root template documents the shared configuration keys.
   Never commit `.env` files or real credentials.

For migration and shared-schema rules, see [database/README.md](database/README.md)
and [docs/database-design.md](docs/database-design.md).

## Install dependencies

Run from the repository root:

```sh
npm --prefix backend install
npm --prefix frontend install
```

## Run locally

Open two terminals from the repository root:

```sh
npm --prefix backend run dev
```

```sh
Copy-Item frontend\.env.example frontend\.env
npm --prefix frontend run dev
```

The API listens on `http://localhost:3000` and exposes its REST endpoints under
`/api`; the Vite frontend listens on `http://localhost:5173`. The dashboard can
run without the backend. The API health endpoint is `GET
http://localhost:3000/api/health`. Configure `CORS_ORIGIN` if the frontend is
served from another origin and `VITE_API_BASE_URL` if the API URL changes.

## Tests, lint, and production build

```sh
npm --prefix backend test
npm --prefix frontend test
npm --prefix backend run lint
npm --prefix frontend run lint
npm --prefix frontend run build
```

Preview a production frontend build with `npm --prefix frontend run preview`.
The backend starts in production mode with `npm --prefix backend start`.

## Current implementation status

Phase 1 established the responsive application shell, modular Express API,
database health check, and baseline MySQL schema. Phase 2 adds cookie-based
authentication, admin-managed users and roles, RBAC for user administration,
and security audit logs. Phase 3 adds item/category/warehouse management and transactional stock operations.
Supplier, procurement, transfers, and reporting remain future work.

## Phase 2 authentication and user management

Apply `database/migrations/20261015120000_auth_sessions_and_audit.sql` after
the baseline schema. See [database/migrations/README.md](database/migrations/README.md)
for migration tracking guidance. Create the first administrator using
`npm --prefix backend run create-admin -- "Full Name" admin@example.com
"a-long-password"`. Public registration creates OPERATOR accounts only; admins can create users,
assign roles, edit names/emails, and activate/deactivate accounts from `/users`.

Login uses a 15-minute signed JWT held in an HttpOnly cookie and a database
session row. Logout revokes the session; deactivation revokes all sessions for
that account. There is no refresh token; users sign in again after expiry.
Set `JWT_SECRET` to a random value of at least 32 characters,
`COOKIE_SECURE=true` in HTTPS production. Local development uses same-site Lax
cookies. For a cross-site deployment, configure a strict origin allowlist and
`SameSite=None` with Secure cookies plus CSRF protections before deployment.

`POST /api/auth/register` creates a standard OPERATOR account. Other auth endpoints are
`POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`.
Administrator-only user endpoints are `GET/POST /api/users`,
`GET/PATCH /api/users/:id`, `PATCH /api/users/:id/role`, and
`PATCH /api/users/:id/activation`. See [docs/api-contracts.md](docs/api-contracts.md).

## Shared schema and two-developer workflow

Developer A owns authentication/users, roles and permissions, audit logs, item
catalog/categories, warehouses, stock levels, and stock movements. Developer B
owns suppliers, purchase orders and their items, transfers and their items,
procurement workflows, analytics, and reporting. Do not add Developer B's
modules to the Phase 1 baseline.

Both developers should coordinate shared names and foreign-key contracts before
adding module tables. Keep `database/schema.sql` as the clean-install baseline;
add reviewed, ordered, forward-only migration files under
`database/migrations/`. Never drop shared tables or edit migrations already
applied to another database. Follow the conventions in
[database/README.md](database/README.md).


## Phase 3 inventory and stock

Apply `database/migrations/20261015130000_stock_transactions.sql` after the
Phase 2 migration. Authenticated users can browse `/inventory`, `/warehouses`,
and `/stock` in the frontend. ADMIN/MANAGER maintain catalog, categories, and
warehouses; all roles can view inventory and submit stock-in/out. Items use an
item-wide minimum stock threshold compared to each warehouse balance. See
[docs/api-contracts.md](docs/api-contracts.md) for API details and the reorder
query contract.
