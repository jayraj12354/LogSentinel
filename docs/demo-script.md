# LogSentinel — Demo Script

## Prerequisites

1. PostgreSQL 15+ running locally.
2. Run `node scripts/setup.js` to bootstrap the DB, run migrations, seed data, and generate sample logs.
3. Start the API: `cd server && npm start` (port 4000).
4. Start the client: `cd client && npm install && npm run dev` (port 5173).
5. (Optional) Start Electron: `cd electron && npm install && npm start`.

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Viewer | viewer | viewer123 |

## Journey 1 — Admin adds a source and imports logs

1. Log in as `admin` / `admin123`.
2. Go to Sources → add `auth-server` → `sample-logs/auth.log` (GENERIC).
3. Click Import → selects `sample-logs/auth.log` → batch summary shows lines ok/failed.
4. Go to Logs → see classified lines with categories (AUTH_FAILURE, AUTH_SUCCESS, etc.).

## Journey 2 — Live watch + desktop alert

1. Go to Sources → Start Watching `auth-server`.
2. Run `node scripts/simulate-attack.js sample-logs/auth.log --ip 203.0.113.99 --count 6 --delay 300`.
3. Within ~2 seconds a desktop notification appears and the tray counter increments.
4. Go to Alerts → see the brute-force alert (OPEN).

## Journey 3 — Analytics

1. Go to Analytics → see top offenders, moving average of errors, fail-then-success sequences.
2. Click "View SQL" on any card to see the underlying SQL.
3. Click "File vs SQL" to compare timing.

## Journey 4 — Alert triage

1. Go to Alerts → acknowledge an alert → status changes to ACKNOWLEDGED.
2. Resolve an alert → status changes to RESOLVED.
3. Tray counter updates.

## Journey 5 — Viewer read-only

1. Log in as `viewer` / `viewer123`.
2. Can read logs, analytics, alerts.
3. Gets 403 on any write (users, sources, rules, policies, ack/resolve).

## Journey 6 — Export

1. Use Export PDF to save a dashboard report.
2. Use Save Text to export filtered log entries as CSV/TXT.
3. Use Capture Dashboard to save a screenshot.
