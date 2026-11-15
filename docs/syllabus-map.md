# LogSentinel — Syllabus Topic Map

## Data Engineering (SQL / PostgreSQL)

| Topic | Where demonstrated |
|-------|-------------------|
| Constraints / CHECK | `db/migrations/...constraints_triggers_indexes.sql`, `docs/ERD.md` |
| Transactions / savepoints | `server/src/services/importService.js` (bulk import transaction) |
| Window functions | `db/queries/04_window_lag.sql`, `db/queries/05_moving_average_errors.sql`, `db/queries/08_alert_window.sql` |
| Joins | `db/queries/03_fail_then_success.sql`, `db/queries/joins_pitfalls.sql` |
| Subqueries | `db/queries/01_top_offenders.sql` |
| Set operations | `db/queries/06_intersect_ips.sql` |
| Trigram index / pg_trgm | `db/migrations/...constraints_triggers_indexes.sql` |
| LISTEN / NOTIFY + trigger | `db/migrations/...constraints_triggers_indexes.sql` (`trg_notify_new_alert`) |
| Roles / GRANT / REVOKE (DCL) | `db/roles.sql`, `db/tests/dcl_check.sql` |
| DDL (CREATE/ALTER/TRUNCATE/DROP) | `db/ddl_demo.sql` |
| Functions (lower/upper/coalesce/cast/date parts) | `db/queries/00_functions_tour.sql` |
| generate_series | `db/seed_synthetic.sql` |

## Interactive System Development (Electron)

| Topic | Where demonstrated |
|-------|-------------------|
| Native dialogs | `electron/ipc/registerIpc.js` (`dialog:openLogFile`, `shell:showItem`, `file:saveText`, `report:exportPdf`, `capture:dashboard`) |
| Tray icon | `electron/tray.js` (counter, click-to-show) |
| Native notifications | `electron/notifications.js` (severity-filtered, sound toggle) |
| BrowserWindow lifecycle | `electron/main.js` (create, show, closed, activate) |
| contextIsolation / sandbox / nodeIntegration | `electron/main.js` webPreferences |
| contextBridge preload | `electron/preload.js` (`window.api` surface only) |
| IPC invoke / send | `electron/ipc/registerIpc.js`, `electron/alertStream.js` |
| SSE → Electron → renderer | `server/src/services/alertListener.js`, `electron/alertStream.js` |
| PDF export | `electron/ipc/registerIpc.js` (`report:exportPdf` via pdf-lib) |
| Screenshot capture | `electron/ipc/registerIpc.js` (`capture:dashboard` via capturePage) |
| Settings persistence | `electron/settings.js` (`userData/settings.json`) |

## Backend Development (Node.js / Express / Prisma)

| Topic | Where demonstrated |
|-------|-------------------|
| Express 4 MVC | `server/src/app.js`, `server/src/routes/v1/`, `server/src/controllers/`, `server/src/models/` |
| JWT authentication | `server/src/middleware/auth.js`, `server/src/controllers/authController.js` |
| bcrypt password hashing | `server/src/controllers/usersController.js`, `db/seed.js` |
| Role-based access control (ADMIN / VIEWER) | route middleware (`adminOnly`) |
| Rate limiting (login throttle) | `server/src/middleware/rateLimit.js` |
| REST API versioning (v1 / v2) | `server/src/app.js` |
| SSE endpoint | `server/src/routes/v1/alertsStream.js` |
| pg Pool (raw SQL for analytics) | `server/src/config/db.js`, `server/src/controllers/analyticsController.js` |
| Prisma ORM (CRUD) | `server/prisma/schema.prisma`, controllers |
| File streaming (readline) | `server/src/services/LogWatcher.js`, `server/src/services/importService.js` |
| EventEmitter watcher | `server/src/services/LogWatcher.js` |
| CommonJS vs ESM demo | `server/src/demo/modules-demo.cjs`, `modules-demo.mjs` |
| Async patterns demo | `server/src/demo/async-demo.js` |
| Streams demo | `server/src/demo/stream-demo.js` |
| Child process demo | `server/src/demo/process-demo.js` |
| Environment config validation | `server/src/config/env.js` |
| Logging (levels) | `server/src/utils/logger.js` |

## Code Conventions

- DB columns `snake_case`; JavaScript `camelCase`; Prisma `@map` / `@@map`.
- API error codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL`.
- Parameterised SQL only (`$1, $2`); never string-concatenate user input.
- Passwords hashed with bcrypt.
- Fictional IPs only from `203.0.113.0/24`, `198.51.100.0/24`, `192.0.2.0/24`.
- Syllabus topics tagged with `// SYLLABUS: <Subject> – <Topic>` comments.
- No file longer than ~300 lines; one responsibility per file.
