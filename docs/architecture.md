# Architecture

ISMS is a JavaScript application split into a React/Vite frontend, an Express
REST API, and a shared MySQL database.

```text
Browser (React + React Router)
    |
    | JSON over REST (/api)
    v
Express app (middleware -> routes -> controllers -> services -> repositories)
    |
    | mysql2/promise pool; parameterized SQL
    v
MySQL 8 (isms_db)
```

The frontend is independently runnable and uses Axios with its API URL supplied
by `VITE_API_BASE_URL`. The backend loads configuration from environment
variables, applies Helmet, CORS, bounded JSON parsing, and request logging, and
returns consistent JSON errors. The health route reports both application and
database availability. Authentication, authorization, and business modules
are intentionally outside this foundation phase.

The two developer ownership areas and shared database contract are documented
in [database design](./database-design.md). Schema changes must be forward-only
versioned migrations.
