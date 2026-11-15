# LogSentinel — REST API Contract

Base URL: `http://localhost:4000`
Auth: `Authorization: Bearer <jwt>` (except public endpoints)

## Response Envelope

Success: `{ "data": ..., "meta": { page, pageSize, total, totalPages }? }`
Error: `{ "error": { "code": "...", "message": "...", "details": [...]? } }`

## Error Codes

`VALIDATION_ERROR` 400 · `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `RATE_LIMITED` 429 · `INTERNAL` 500

## Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check `{ status, uptime, db }` |
| GET | `/api/v2/health` | Version 2 health `{ version: 2 }` |
| POST | `/api/v1/auth/login` | Throttled login `{ username, password }` → `{ token, user }` |

### Authenticated (Any role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/auth/me` | Current user profile |
| GET | `/api/v1/sources` | List sources (`?active=true`) |
| GET | `/api/v1/sources/:id` | Read one source |
| GET | `/api/v1/rules` | List rules |
| GET | `/api/v1/policies` | List policies |
| GET | `/api/v1/logs` | List log entries with filters + pagination |
| GET | `/api/v1/logs/filters` | Distinct sources, levels, categories |
| GET | `/api/v1/logs/:sourceId/:lineNo` | One log entry with raw |
| GET | `/api/v1/analytics/summary` | Dashboard numbers |
| GET | `/api/v1/analytics/file-vs-sql` | Timing comparison |
| GET | `/api/v1/analytics/:name` | Run catalogued SQL query |
| GET | `/api/v1/analytics/:name/sql` | Return .sql text |
| GET | `/api/v1/alerts` | List alerts (`?status&severity&page&pageSize`) |
| GET | `/api/v1/alerts/:id` | One alert with details |
| GET | `/api/v1/alerts/stream` | SSE alert stream (event: `alert`) |

### Admin Only

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/DELETE | `/api/v1/users` | Manage users |
| POST/PUT/DELETE | `/api/v1/sources` | Manage sources |
| POST | `/api/v1/sources/:id/import` | Bulk import a log file |
| POST/DELETE/GET | `/api/v1/sources/:id/watch` | Start/stop/status live tailing |
| POST/PUT/DELETE | `/api/v1/rules` | Manage rules |
| POST | `/api/v1/rules/test` | Test a regex pattern |
| POST/PUT/DELETE | `/api/v1/policies` | Manage alert policies |
| PATCH | `/api/v1/alerts/:id/ack` | Acknowledge an alert |
| PATCH | `/api/v1/alerts/:id/resolve` | Resolve an alert |

## Pagination

`?page=1&pageSize=25` (1-based, default 25, max 200).
Response `meta: { page, pageSize, total, totalPages }`.

## Log Filters (GET /api/v1/logs)

`sourceId, level (comma list), category, ip, q, from, to, hasOpenAlert, page, pageSize`
