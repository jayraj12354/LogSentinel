# LogSentinel — Desktop Log Monitoring & Alerting System

> **This is a build specification written for an AI coding assistant.** It describes a complete college project, split into **12 build parts**, with exact names, contracts, and acceptance checks. Read Sections 0–11 fully, then build **one part at a time**.

| | |
|---|---|
| **Project** | LogSentinel — reads server log files, classifies every line, stores them in PostgreSQL, analyses them with advanced SQL, and raises real-time desktop alerts |
| **Based on** | Problem statement #296 — *Establishing a server log system for e-governance with appropriate notification and content-based classification of logs* |
| **Stack** | JavaScript, Node.js 20, Express 4, PostgreSQL 15+, Prisma 6 + `pg`, React 18 (Vite), Electron |
| **Subjects covered** | Data Engineering (SQL/PostgreSQL) · Interactive System Development (Electron) · Backend Development (Node.js/Express/Prisma) |
| **Target OS** | Windows 10/11 first; must also work on macOS and Linux |

---

## 0. How to use this document (instructions for the AI)

1. **Read everything in Sections 0–11 before writing code.** Sections 7–10 are *contracts* (database, log formats, REST API, IPC). Every part must use these names **exactly**.
2. **Build one part at a time, in order (Part 1 → Part 12).** When told "build Part N": (a) restate the scope in 3 bullets, (b) create or modify the files, (c) run every item in that part's **Acceptance checklist**, (d) print a short summary listing files created, checks passed, and any deviations.
3. **Never silently change a contract.** If a contract must change, edit the relevant section of this document first and mention it in your summary.
4. **Keep the code explainable.** The student must explain every file to a professor. Prefer small functions, clear names, plain JavaScript, and short plain-English comments. Avoid clever one-liners, heavy abstractions, and unrequested libraries.
5. **Tag syllabus topics in code.** At the exact place a syllabus topic is demonstrated, add a comment: `// SYLLABUS: <Subject> – <Topic>` (example: `// SYLLABUS: Data Engineering – Window Functions: LAG()`).
6. **Do not skip the "teaching" deliverables** (demo scripts, `.sql` showcase files, docs). They exist so the student can demonstrate syllabus topics live.
7. **Security rules that always apply:** parameterised SQL only (`$1, $2`; never string-concatenate user input into SQL); never commit secrets; passwords hashed with bcrypt; validate every request body and every IPC payload.
8. **When something is ambiguous, choose the simplest option that satisfies the acceptance checklist, and note the choice in your summary.**
9. **Use fictional data only.** Sample IPs must come from the documentation ranges `203.0.113.0/24`, `198.51.100.0/24`, `192.0.2.0/24`.

**Suggested prompt for the student to give an AI:**
> "Read this entire README. Confirm you understand the contracts in Sections 7–10. Then build **Part 1 only**, run its acceptance checklist, and report. Wait for me to say 'next' before starting Part 2."

---

## 1. Project overview

**What the app does**
- Registers log *sources* (a log file on disk plus its format).
- Imports a file in bulk, or *watches* it live (tails new lines as they are appended).
- Parses each line, **classifies** it with admin-editable regex rules (e.g. `AUTH_FAILURE`, `SQL_INJECTION`), and stores it in PostgreSQL.
- Evaluates **alert policies** (e.g. "5 failed logins from one IP within 5 minutes") and raises alerts.
- Pushes alerts in real time to the desktop: native notifications, a tray icon with a counter, and in-app toasts.
- Offers a log viewer, an analytics page (window functions, joins, subqueries, set operations), alert triage, PDF/CSV export, and dashboard screenshots.

**Roles**
- `ADMIN`: manage users, sources, rules, policies; import/watch; acknowledge and resolve alerts.
- `VIEWER`: read-only access to logs, alerts, and analytics.

**Core user journeys (used for acceptance and the demo)**
1. Admin logs in → adds a source → imports `sample-logs/auth.log` → sees classified lines in the log viewer.
2. Admin starts watching a source → runs `node scripts/simulate-attack.js` → a desktop notification appears within ~2 seconds.
3. Admin opens Analytics → sees top offenders, moving average of errors, fail-then-success sequences, and can click "View SQL" on any card.
4. Admin acknowledges and resolves an alert; the tray counter updates.
5. Viewer logs in → can read everything but gets `403` on any write.

---

## 2. Tech stack and pinned versions

| Layer | Choice | Notes |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Use built-in `fetch`, `fs`, `readline`, `events`, `http`, `path`, `crypto` |
| Web framework | **Express `^4.19`** | **Pin to v4** (v5 changes route syntax) |
| Database | **PostgreSQL 15+** | Needs `pg_trgm` (PG 13+ trusted extension) |
| ORM | **Prisma `^6`** | **Pin to v6**; newer majors change config and client setup |
| DB driver | **`pg ^8`** (`Pool`, `Client`) | Raw SQL for analytics, transactions, LISTEN/NOTIFY |
| Desktop | **Electron (current stable, ≥ 30)** | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` |
| UI | **React 18 + Vite ≥ 5**, React Router 6 (**HashRouter**), Recharts | Plain CSS, no UI framework |
| Auth | `jsonwebtoken`, `bcryptjs` | `bcryptjs` avoids native-build problems on Windows |
| Tooling | `nodemon`, `concurrently`, `wait-on`, `cross-env`, `dotenv`, `cors`, `jest`, `supertest`, `eslint`, `prettier`, `electron-builder` | |
| Module systems | **CommonJS** in `server/` and `electron/`; **ES modules** in `client/` | Part 1 includes a CJS-vs-ESM demo |
| Language | **JavaScript only** (no TypeScript) | |

---

## 3. Architecture

```
┌──────────────────────────── Electron (desktop shell) ────────────────────────────┐
│ main.js ── spawns / monitors ──► Express server :4000 ──► PostgreSQL              │
│   │  ▲                             │  REST /api/v1  +  SSE /api/v1/alerts/stream  │
│   │  │ IPC (invoke / send)         │  Prisma (CRUD)  +  pg Pool (SQL, tx, NOTIFY) │
│   ▼  │                             ▼                                              │
│ preload.js ─contextBridge─► React UI (renderer, window.api only)                  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Data flow**
`log file` → `LogWatcher` (streams + EventEmitter) → `logParser` → `classifier` → `importService` (transaction + savepoints) → `log_entries` → `alertEngine` → `alerts` → DB trigger `NOTIFY new_alert` → `alertListener` (`LISTEN`) → SSE → Electron main (`alertStream`) → native Notification + tray + IPC `alert:new` → React.

**Equal-use principle: what breaks without each technology**

| Technology | Its unique job in this project |
|---|---|
| Node.js | File streaming, `EventEmitter` watcher, child-process management, crypto/bcrypt, timers |
| Express | REST API, middleware chain, versioning, SSE endpoint, static hosting of the React build |
| PostgreSQL | Constraints, transactions/savepoints, window functions, full analytics, roles/grants, `LISTEN/NOTIFY`, trigger |
| Electron | Native dialogs, tray, notifications, background running, PDF export, screenshots, window management |
| JavaScript | Parser, regex classifier, alert logic, React UI logic, Electron main logic |
| React | All screens, charts, forms, live alert feed |

---

## 4. Repository structure (create exactly this)

```
logsentinel/
├── package.json                  # root scripts only (concurrently, wait-on, cross-env)
├── .env.example  .env  .gitignore
├── db/
│   ├── 00_create_database.sql    # bootstrap role + database
│   ├── roles.sql                 # DCL: viewer role, GRANT/REVOKE
│   ├── ddl_demo.sql              # DDL showcase (CREATE/ALTER/TRUNCATE/DROP)
│   ├── seed_synthetic.sql        # generate_series demo rows
│   ├── seed.js                   # users, sources, rules, policies
│   ├── queries/                  # 00_functions_tour.sql, 01..17 analytics, joins_pitfalls.sql
│   └── tests/dcl_check.sql
├── server/
│   ├── package.json
│   ├── prisma/ (schema.prisma, migrations/)
│   └── src/
│       ├── server.js  app.js
│       ├── config/       env.js  db.js  prisma.js
│       ├── routes/       v1/ (index + one file per resource)   v2/
│       ├── controllers/  models/  middleware/  utils/
│       ├── services/     logParser.js classifier.js LogWatcher.js watchManager.js
│       │                 importService.js alertEngine.js alertListener.js ingestBus.js
│       ├── http-demo/    rawServer.js
│       └── demo/         modules-demo.cjs modules-demo.mjs async-demo.js stream-demo.js process-demo.js REPL_NOTES.md
│   └── tests/
├── client/                       # React + Vite
│   └── src/ (api/ context/ desktop/ components/ pages/ hooks/ styles/ App.jsx main.jsx)
├── electron/
│   ├── package.json  main.js  preload.js  config.js  menu.js  tray.js
│   ├── serverManager.js  alertStream.js  notifications.js  settings.js
│   ├── windows/ (mainWindow.js alertWindow.js splash.js)
│   ├── ipc/ (registerIpc.js dialogs.js windows.js appInfo.js auth.js settings.js files.js)
│   ├── assets/  placeholder/index.html
├── scripts/                      # generate-logs.js  simulate-attack.js  setup.js
├── sample-logs/                  # generated (git-ignored)
├── docs/                         # ERD, API, IPC, notes, demo script, syllabus map
└── .vscode/launch.json
```

---

## 5. Global conventions

- **Naming:** DB columns `snake_case`; JavaScript `camelCase`; Prisma uses `@map` / `@@map`. Table names are plural snake_case.
- **API response envelope:** success → `{ "data": ..., "meta": { ... }? }`; error → `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...]? } }`.
- **Error codes:** `VALIDATION_ERROR` 400 · `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `RATE_LIMITED` 429 · `INTERNAL` 500.
- **Pagination:** `?page=1&pageSize=25` (1-based, default 25, max 200) → `meta: { page, pageSize, total, totalPages }`.
- **Time:** API uses ISO-8601 UTC strings; DB uses `TIMESTAMPTZ`.
- **MVC rules:** `routes` only map URLs to controllers; `controllers` handle HTTP only; `models` talk to the database; `services` hold business logic with no `req`/`res`.
- **Prisma vs `pg`:** *Prisma migrations own the schema.* Prisma handles CRUD for `users`, `sources`, `rules`, `alert_policies`, `alerts`. The `pg` Pool handles analytics SQL, bulk inserts, transactions with savepoints, and LISTEN/NOTIFY.
- **File size:** no file longer than ~300 lines; one responsibility per file.
- **Logging:** `server/src/utils/logger.js` wrapping `console` with levels. No extra logging libraries.
- **Git:** one commit per part, message `Part N: <title>`, tag `part-N`.
- **Cross-platform:** use the `path` module; write helper scripts in Node, not bash.
- **Ports:** API `4000` · Vite `5173` · raw HTTP demo `4001`.

---

## 6. Environment and configuration

`.env.example` (copy to `.env`; passwords are **development-only placeholders**):

```ini
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://logsentinel_app:app_pass@localhost:5432/logsentinel?schema=public
ANALYTICS_DATABASE_URL=postgresql://logsentinel_viewer:viewer_pass@localhost:5432/logsentinel
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=10
CLIENT_ORIGIN=http://localhost:5173
IMPORT_BATCH_SIZE=500
ALERT_EVAL_INTERVAL_MS=5000
WATCH_ON_START=false
# Electron-only flags
LS_SPAWN_SERVER=0
LS_PLACEHOLDER=0
```

`server/src/config/env.js` loads `dotenv`, validates required variables (`DATABASE_URL`, `ANALYTICS_DATABASE_URL`, `JWT_SECRET`), exits with a clear message if any is missing, and exports a frozen config object.

---

## 7. Database contract

### 7.1 Entities and relationships

| Table | PK | Key columns | Foreign keys |
|---|---|---|---|
| `users` | `id` | `username` UNIQUE, `email` UNIQUE, `password_hash`, `role` | — |
| `sources` | `id` | `name` UNIQUE, `file_path`, `format`, `is_active` | — |
| `rules` | `id` | `name` UNIQUE, `pattern`, `flags`, `category`, `severity`, `is_active` | `created_by → users` |
| `alert_policies` | `id` | `name` UNIQUE, `category`, `threshold_count`, `window_seconds`, `group_by`, `severity` | — |
| `import_batches` | `id` | `file_name`, `status`, `lines_total/ok/failed`, `started_at`, `finished_at` | `source_id → sources` |
| `log_entries` | **(`source_id`, `line_no`)** — *weak entity* | `logged_at`, `level`, `message`, `ip` (INET), `category`, `raw` (JSONB) | `source_id → sources` (identifying), `rule_id → rules`, `batch_id → import_batches` |
| `alerts` | `id` | `title`, `severity`, `event_count`, `ip`, `dedupe_key`, `status`, window start/end, `details` (JSONB) | `policy_id → alert_policies`, `source_id → sources`, `acknowledged_by → users` |

**Cardinalities:** Source 1:N LogEntry (identifying) · Source 1:N ImportBatch · ImportBatch 1:N LogEntry · Rule 1:N LogEntry · User 1:N Rule · AlertPolicy 1:N Alert · Source 1:N Alert · User 1:N Alert (acknowledger).

`log_entries` is a **weak entity**: a line has no identity without its source, so its primary key is the composite (`source_id`, `line_no`).

### 7.2 `server/prisma/schema.prisma` (use exactly this)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  VIEWER
}

enum LogFormat {
  GENERIC
  ACCESS
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
  CRITICAL
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum AlertStatus {
  OPEN
  ACKNOWLEDGED
  RESOLVED
}

enum BatchStatus {
  RUNNING
  COMPLETED
  FAILED
}

enum GroupBy {
  IP
  SOURCE
}

model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique @db.VarChar(50)
  email        String   @unique @db.VarChar(120)
  passwordHash String   @map("password_hash")
  role         Role     @default(VIEWER)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  rules              Rule[]
  acknowledgedAlerts Alert[]

  @@map("users")
}

model Source {
  id        Int       @id @default(autoincrement())
  name      String    @unique @db.VarChar(80)
  filePath  String?   @map("file_path")
  format    LogFormat @default(GENERIC)
  isActive  Boolean   @default(true) @map("is_active")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  entries LogEntry[]
  batches ImportBatch[]
  alerts  Alert[]

  @@map("sources")
}

model Rule {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(80)
  pattern   String
  flags     String   @default("i") @db.VarChar(5)
  category  String   @db.VarChar(40)
  severity  Severity
  isActive  Boolean  @default(true) @map("is_active")
  createdBy Int?     @map("created_by")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  creator User?      @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  entries LogEntry[]

  @@map("rules")
}

model AlertPolicy {
  id             Int      @id @default(autoincrement())
  name           String   @unique @db.VarChar(80)
  category       String   @db.VarChar(40)
  thresholdCount Int      @map("threshold_count")
  windowSeconds  Int      @map("window_seconds")
  groupBy        GroupBy  @default(IP) @map("group_by")
  severity       Severity
  isActive       Boolean  @default(true) @map("is_active")

  alerts Alert[]

  @@map("alert_policies")
}

model ImportBatch {
  id          Int         @id @default(autoincrement())
  sourceId    Int         @map("source_id")
  fileName    String      @map("file_name")
  status      BatchStatus @default(RUNNING)
  linesTotal  Int         @default(0) @map("lines_total")
  linesOk     Int         @default(0) @map("lines_ok")
  linesFailed Int         @default(0) @map("lines_failed")
  startedAt   DateTime    @default(now()) @map("started_at") @db.Timestamptz(6)
  finishedAt  DateTime?   @map("finished_at") @db.Timestamptz(6)

  source  Source     @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  entries LogEntry[]

  @@map("import_batches")
}

model LogEntry {
  sourceId Int      @map("source_id")
  lineNo   Int      @map("line_no")
  batchId  Int?     @map("batch_id")
  loggedAt DateTime @map("logged_at") @db.Timestamptz(6)
  level    LogLevel
  message  String
  ip       String?  @db.Inet
  category String?  @db.VarChar(40)
  ruleId   Int?     @map("rule_id")
  raw      Json?

  source Source       @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  rule   Rule?        @relation(fields: [ruleId], references: [id], onDelete: SetNull)
  batch  ImportBatch? @relation(fields: [batchId], references: [id], onDelete: SetNull)

  @@id([sourceId, lineNo])
  @@index([loggedAt], map: "idx_log_entries_logged_at")
  @@index([category, loggedAt], map: "idx_log_entries_category_time")
  @@index([ip], map: "idx_log_entries_ip")
  @@map("log_entries")
}

model Alert {
  id             Int         @id @default(autoincrement())
  policyId       Int         @map("policy_id")
  sourceId       Int?        @map("source_id")
  title          String
  severity       Severity
  eventCount     Int         @map("event_count")
  ip             String?     @db.Inet
  dedupeKey      String      @map("dedupe_key") @db.VarChar(120)
  status         AlertStatus @default(OPEN)
  windowStart    DateTime    @map("window_start") @db.Timestamptz(6)
  windowEnd      DateTime    @map("window_end") @db.Timestamptz(6)
  triggeredAt    DateTime    @default(now()) @map("triggered_at") @db.Timestamptz(6)
  acknowledgedBy Int?        @map("acknowledged_by")
  acknowledgedAt DateTime?   @map("acknowledged_at") @db.Timestamptz(6)
  details        Json?

  policy       AlertPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  source       Source?     @relation(fields: [sourceId], references: [id], onDelete: SetNull)
  acknowledger User?       @relation(fields: [acknowledgedBy], references: [id], onDelete: SetNull)

  @@unique([policyId, dedupeKey])
  @@index([status, triggeredAt], map: "idx_alerts_status_time")
  @@map("alerts")
}
```

### 7.3 Hand-written migration SQL

Create with `npx prisma migrate dev --create-only --name constraints_triggers_indexes`, paste the SQL below into the generated file, then apply with `npx prisma migrate dev`.

```sql
-- Domain / CHECK constraints
ALTER TABLE users          ADD CONSTRAINT chk_users_email     CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
ALTER TABLE rules          ADD CONSTRAINT chk_rules_category  CHECK (category ~ '^[A-Z_]+$');
ALTER TABLE rules          ADD CONSTRAINT chk_rules_flags     CHECK (flags ~ '^[gimsuy]*$');
ALTER TABLE alert_policies ADD CONSTRAINT chk_policy_threshold CHECK (threshold_count > 0);
ALTER TABLE alert_policies ADD CONSTRAINT chk_policy_window    CHECK (window_seconds BETWEEN 1 AND 86400);
ALTER TABLE import_batches ADD CONSTRAINT chk_batch_counts     CHECK (lines_total >= 0 AND lines_ok >= 0 AND lines_failed >= 0);
ALTER TABLE log_entries    ADD CONSTRAINT chk_log_entries_line_no CHECK (line_no > 0);
ALTER TABLE alerts         ADD CONSTRAINT chk_alert_window     CHECK (window_end >= window_start);
ALTER TABLE alerts         ADD CONSTRAINT chk_alert_ack        CHECK (status = 'OPEN' OR acknowledged_at IS NOT NULL);

-- Trigram index to speed up ILIKE '%text%' searches (PG 13+, trusted extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_log_entries_message_trgm ON log_entries USING gin (message gin_trgm_ops);

-- Real-time notification: every new alert is announced on channel "new_alert"
CREATE OR REPLACE FUNCTION notify_new_alert() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('new_alert',
    json_build_object('id', NEW.id, 'severity', NEW.severity, 'title', NEW.title)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_alert
AFTER INSERT ON alerts
FOR EACH ROW EXECUTE FUNCTION notify_new_alert();
```

### 7.4 Bootstrap and roles

`db/00_create_database.sql` (run once as the `postgres` superuser):

```sql
CREATE ROLE logsentinel_app LOGIN PASSWORD 'app_pass' CREATEDB;  -- CREATEDB is needed by Prisma's shadow database
CREATE DATABASE logsentinel OWNER logsentinel_app;
```

`db/roles.sql` (DCL; run **after** migrations, as the database owner):

```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'logsentinel_viewer') THEN
    CREATE ROLE logsentinel_viewer LOGIN PASSWORD 'viewer_pass';
  END IF;
END $$;

GRANT CONNECT ON DATABASE logsentinel TO logsentinel_viewer;
GRANT USAGE   ON SCHEMA public        TO logsentinel_viewer;
GRANT SELECT  ON ALL TABLES IN SCHEMA public TO logsentinel_viewer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO logsentinel_viewer;

-- Hide password hashes from the read-only role
REVOKE SELECT ON users FROM logsentinel_viewer;
GRANT  SELECT (id, username, email, role, created_at) ON users TO logsentinel_viewer;
```

The analytics `readPool` connects as `logsentinel_viewer`, so even a bug in an analytics query cannot modify data.

### 7.5 Seed data specification

**Users (dev only):** `admin` / `admin123` (ADMIN, `admin@logsentinel.local`) · `viewer` / `viewer123` (VIEWER, `viewer@logsentinel.local`).

**Sources**

| name | format | file_path | purpose |
|---|---|---|---|
| `auth-server` | GENERIC | `sample-logs/auth.log` | logins, sudo, firewall |
| `web-access` | ACCESS | `sample-logs/access.log` | web requests and attacks |
| `app-server` | GENERIC | `sample-logs/app.log` | application errors |
| `synthetic-demo` | GENERIC | *(none)* | rows created by `generate_series` in Part 5 |
| `silent-demo` | GENERIC | *(none)* | never receives logs (for the "silent source" query) |

**Classification rules** (all flags `i`; if several match, the **highest severity wins**, ties → lowest `id`; no match → `category = NULL`, `rule_id = NULL`)

| name | pattern (JS regex source) | category | severity |
|---|---|---|---|
| Login failure | `failed password\|authentication failure\|invalid user\|login failed` | `AUTH_FAILURE` | MEDIUM |
| Login success | `accepted password\|accepted publickey\|session opened\|login successful` | `AUTH_SUCCESS` | LOW |
| Privilege escalation | `not in the sudoers\|not in sudoers\|su: failed\|sudo:.*incorrect password` | `PRIV_ESC` | HIGH |
| Port scan | `port scan\|nmap\|syn flood\|probe from` | `PORT_SCAN` | HIGH |
| SQL injection | `union\s+select\|or\s+1\s*=\s*1\|drop\s+table\|sleep\(\d+\)` | `SQL_INJECTION` | CRITICAL |
| Path traversal | `\.\./\|%2e%2e\|/etc/passwd\|/etc/shadow` | `PATH_TRAVERSAL` | HIGH |
| Application error | `exception\|stack trace\|fatal\|panic\|out of memory\|segfault\|\s5\d{2}\s` | `APP_ERROR` | MEDIUM |
| Service event | `restarted\|shutting down\|service stopped` | `SERVICE_EVENT` | LOW |

**Alert policies**

| name | category | threshold | window (s) | group_by | severity |
|---|---|---|---|---|---|
| Brute-force login | `AUTH_FAILURE` | 5 | 300 | IP | HIGH |
| Port scan activity | `PORT_SCAN` | 3 | 60 | IP | HIGH |
| Injection attempt | `SQL_INJECTION` | 1 | 60 | IP | CRITICAL |
| Path traversal attempt | `PATH_TRAVERSAL` | 2 | 120 | IP | HIGH |
| Application error burst | `APP_ERROR` | 10 | 60 | SOURCE | MEDIUM |
| Privilege escalation | `PRIV_ESC` | 1 | 300 | SOURCE | HIGH |

**Sample log generation** (`scripts/generate-logs.js`, deterministic with `--seed 42`; spans the **last 48 hours**, ending 5 minutes before run time)

- `auth.log` (~5,000 lines): normal sessions, plus two bursts of ≥ 40 failed logins from `203.0.113.45` (within 3 minutes each), 8 failures from `198.51.100.23`, one **successful login from `203.0.113.45` within 10 minutes after failures**, 2 sudo failures, and a `[firewall]` **port-scan** burst from `203.0.113.45` (≥ 4 lines in 60 s).
- `access.log` (~6,000 lines): normal GET/POST traffic, 3+ SQL-injection requests from `192.0.2.77`, 4+ path-traversal requests from `198.51.100.23`, a cluster of 15 HTTP 500 responses within one minute, and some requests using the user-agent `nmap`.
- `app.log` (~3,000 lines): INFO/DEBUG noise, a burst of 12 exceptions within 60 s, one "service restarted" line, one "FATAL out of memory" line.
- Required overlaps for the analytics demos: at least one IP appears in both `AUTH_FAILURE` and `PORT_SCAN`; at least one IP has `AUTH_FAILURE` followed by `AUTH_SUCCESS` within 10 minutes.

`scripts/simulate-attack.js <logfile> [--ip 203.0.113.99] [--count 6] [--delay 300]` appends `--count` failed-login lines (current timestamps, `--delay` ms apart) for the live demo.

---

## 8. Log formats and classification

**GENERIC** (`auth.log`, `app.log`):
```
2025-03-14T10:23:45.123Z WARN [sshd] Failed password for invalid user admin from 203.0.113.45 port 52134 ssh2
```
Regex: `^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\s+(DEBUG|INFO|WARN|ERROR|CRITICAL)\s+\[([^\]]+)\]\s+(.*)$`
→ `loggedAt`, `level`, `component`, `message`. `raw = { component, text }`.

**ACCESS** (`access.log`):
```
203.0.113.45 - - [14/Mar/2025:10:23:45 +0000] "GET /products?id=1%20UNION%20SELECT%20x HTTP/1.1" 404 512 "-" "curl/8.0"
```
Regex: `^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+|-)(?: "([^"]*)" "([^"]*)")?$`
→ `ip`, `loggedAt` (parse `dd/Mon/yyyy:HH:mm:ss Z` manually), `message = "<METHOD> <decoded path> <status> \"<user-agent>\""` (URL-decode the path inside `try/catch`), `raw = { method, path, status, bytes, referrer, userAgent }`.
`level` from status: `5xx → ERROR`, `4xx → WARN`, otherwise `INFO`.

**IP extraction (GENERIC):** first IPv4 in the message that matches `\b(?:\d{1,3}\.){3}\d{1,3}\b` with every octet ≤ 255; otherwise `null`.

**Parser contract:** `parseLine(line, format)` returns `{ loggedAt: Date, level, message, ip, raw }` or `null` if the line is malformed. It also strips NUL (`\u0000`) characters. Pure function, no I/O.

**Classifier contract:** `compileRules(rules)` → compiled list (invalid regexes are skipped with a warning); `classify(message, compiled)` → `{ category, ruleId, severity } | { category: null, ruleId: null, severity: null }`.

---

## 9. REST API contract

Base paths: `/api/v1` and `/api/v2`. Auth = `Authorization: Bearer <jwt>`. **A** = ADMIN only; **Any** = ADMIN or VIEWER; **Public** = no token.

| Method | Path | Auth | Purpose | Part |
|---|---|---|---|---|
| GET | `/health` | Public | `{ status, uptime, db }` | 4 |
| POST | `/auth/login` | Public | `{ username, password }` → `{ token, user }` (throttled) | 4 |
| GET | `/auth/me` | Any | current user | 4 |
| GET / POST / DELETE | `/users`, `/users/:id` | A | list / create / delete users | 4 |
| GET | `/sources`, `/sources/:id` | Any | list / read sources (`?active=true`) | 4 |
| POST / PUT / DELETE | `/sources`, `/sources/:id` | A | create / update / delete | 4 |
| POST | `/sources/:id/import` | A | body `{ filePath }` → imports file → batch summary | 6 |
| GET | `/sources/:id/batches` | Any | import history | 6 |
| POST / DELETE / GET | `/sources/:id/watch` | A / A / Any | start / stop / status of live tailing | 6 |
| GET | `/rules` | Any | list rules | 4 |
| POST / PUT / DELETE | `/rules`, `/rules/:id` | A | manage rules (reloads classifier cache) | 4 |
| POST | `/rules/test` | A | `{ pattern, flags, sample }` → `{ matched, error? }` | 4 |
| GET | `/policies` | Any | list policies | 4 |
| POST / PUT / DELETE | `/policies`, `/policies/:id` | A | manage policies | 4 |
| GET | `/logs` | Any | filters: `sourceId, level (comma list), category, ip, q, from, to, hasOpenAlert, page, pageSize` | 5 |
| GET | `/logs/filters` | Any | distinct sources, levels, categories | 5 |
| GET | `/logs/:sourceId/:lineNo` | Any | one entry with `raw` | 5 |
| GET | `/analytics/summary` | Any | dashboard numbers | 5, 10 |
| GET | `/analytics/file-vs-sql` | Any | `?sourceId&ip` → timing comparison | 9 |
| GET | `/analytics/:name` | Any | run one catalogued query (Section Part 9) | 9 |
| GET | `/analytics/:name/sql` | Any | returns the `.sql` text (whitelisted names) | 9 |
| GET | `/alerts` | Any | `?status&severity&page&pageSize` | 10 |
| GET | `/alerts/:id` | Any | one alert with `details` | 10 |
| PATCH | `/alerts/:id/ack`, `/alerts/:id/resolve` | A | state change (OPEN → ACKNOWLEDGED → RESOLVED; resolve from OPEN also sets ack fields) | 10 |
| GET | `/alerts/stream` | Any | Server-Sent Events; event `alert` | 10 |
| GET | `/api/v2/health` | Public | `{ version: 2 }` | 4 |
| GET | `/api/v2/logs` | Any | **keyset pagination**: `?limit=50&cursor=...` → `{ data, nextCursor }` (cursor encodes `loggedAt\|sourceId\|lineNo`, order `logged_at DESC, source_id, line_no`) | 5 |

**Route-order rule:** register `/analytics/summary` and `/analytics/file-vs-sql` **before** `/analytics/:name`, otherwise `:name` swallows them.

---

## 10. Electron IPC contract

All `invoke` handlers return `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. They never throw into the renderer. Every handler checks the sender (`event.senderFrame.url` must be the app origin) and validates payload types.

**Request–response (`ipcMain.handle` / `ipcRenderer.invoke`)**

| Channel | Payload | `data` | Part |
|---|---|---|---|
| `dialog:openLogFile` | — | `{ canceled, filePath }` | 8 |
| `app:getInfo` | — | `{ name, version, electron, chrome, node, platform, isPackaged }` | 8 |
| `window:toggleFullscreen` | — | `{ fullscreen }` | 8 |
| `window:openAlertDetail` | `{ alertId }` | `{ opened: true }` | 8 |
| `shell:showItem` | `{ filePath }` (only paths returned earlier by main or under `userData`) | `{ shown: true }` | 8 |
| `settings:get` | — | settings object | 8 |
| `settings:set` | partial settings | updated settings | 8 |
| `auth:setToken` | `{ token \| null }` | `{ stored }` | 8 |
| `server:getStatus` | — | `{ running, pid?, port, lastCheck }` | 8 |
| `file:saveText` | `{ defaultName, content, filters? }` | `{ canceled, filePath }` | 11 |
| `report:exportPdf` | `{ defaultName? }` | `{ canceled, filePath }` | 11 |
| `capture:dashboard` | — | `{ filePath }` | 11 |

**Events (main → renderer via `webContents.send`)**

| Channel | Payload | Part |
|---|---|---|
| `server:status` | `{ running, lastCheck }` | 8 |
| `shortcut:navigate` | `{ route }` | 8 |
| `settings:changed` | settings object | 8 |
| `shortcut:refresh` | — | 11 |
| `alert:new` | alert object | 11 |

**Settings defaults:** `{ notifications: true, minSeverity: "MEDIUM", minimizeToTray: true, launchAtStartup: false, soundAlerts: false, theme: "system" }`, stored in `userData/settings.json`.

**Preload surface (`window.api`, nothing else is exposed, `ipcRenderer` is never exposed):**
`openLogFile()`, `saveText(opts)`, `exportPdf(opts)`, `captureDashboard()`, `getAppInfo()`, `toggleFullscreen()`, `openAlertWindow(alertId)`, `showInFolder(filePath)`, `getSettings()`, `setSettings(patch)`, `setAuthToken(token)`, `getServerStatus()`, `getPathForFile(file)` (uses `webUtils`, no IPC), `onServerStatus(cb)`, `onNavigate(cb)`, `onRefresh(cb)`, `onAlert(cb)`, `onSettingsChanged(cb)`. Every `on*` returns an **unsubscribe function**.

---

## 11. Build plan overview — 12 parts

The Interactive System Development (Electron) syllabus is kept together in **three cohesive parts (3, 8, 11)**, deliberately spaced out so desktop work alternates with database, backend, and frontend work.

| Part | Title | Track | Effort | Depends on |
|---|---|---|---|---|
| 1 | Foundation & Backend Fundamentals | Backend | S | — |
| 2 | Database Design & Data Modelling | Database | M | 1 |
| 3 | **Electron A** — Shell, Lifecycle, Windows & Core APIs | **ISD** | M | 1 |
| 4 | Express MVC API & Authentication | Backend | L | 2 |
| 5 | SQL Command Categories, Retrieval & Functions | Database | M | 2, 4 |
| 6 | Log Ingestion Engine (Streams, Events, Transactions) | Backend | L | 2, 5 |
| 7 | React Client Core | Frontend | L | 4, 5, 6 |
| 8 | **Electron B** — IPC, Secure Preload & Backend Integration | **ISD** | M | 3, 7 |
| 9 | Advanced SQL Analytics | Database | L | 5, 6, 7 |
| 10 | Alert Engine & Real-Time Pipeline | Backend | M | 6, 9 |
| 11 | **Electron C** — Desktop Features, Background Behaviour & Distribution | **ISD** | L | 8, 10 |
| 12 | Testing, Documentation & Demo Readiness | QA | M | all |



---

