# 07. Database and Backend Integration

This document details the software architecture, drivers, ORM layers, and asynchronous event pipelines that connect the **Node.js / Express backend** with the **PostgreSQL 16 database**.

---

## 1. Integration Architecture Overview

LogSentinel utilizes a **hybrid database access architecture**:
1. **Prisma ORM (`@prisma/client`)**: Used for domain CRUD operations, schema migrations, type-safe entity relations, and user authentication.
2. **Native Connection Pool (`pg.Pool`)**: Used for high-throughput batch stream ingestion, real-time trigger pub/sub notifications, and complex analytical SQL queries (window functions, `GROUP BY ... HAVING`, `date_trunc`).
3. **Dual Database Role Isolation**:
   - `logsentinel_app`: Full DML access for transactions and data ingestion.
   - `logsentinel_viewer`: Dedicated read-only credentials for analytical endpoints, enforcing the principle of least privilege.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Express Backend Layer                           │
│  ┌───────────────────────┐                  ┌───────────────────────┐  │
│  │   Domain Controllers  │                  │  Analytics Controller │  │
│  │ (Auth, Rules, Alerts) │                  │ (Window Functions/Agg)│  │
│  └───────────┬───────────┘                  └───────────┬───────────┘  │
└──────────────┼──────────────────────────────────────────┼──────────────┘
               │                                          │
       Prisma Client (ORM)                        pg.Pool (Native SQL)
       Role: logsentinel_app                      Role: logsentinel_viewer
               │                                          │
               ▼                                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL Engine                             │
│  ┌─────────────────────────┐              ┌─────────────────────────┐  │
│  │     Public Schema       │              │    pg_notify Trigger    │  │
│  │ 7 Tables + Constraints  │              │   'new_alert' Channel   │  │
│  └─────────────────────────┘              └─────────────┬───────────┘  │
└─────────────────────────────────────────────────────────┼──────────────┘
                                                          │
                                                          ▼
                                            pg.Client.on('notification')
                                                          │
                                                          ▼
                                            Server-Sent Events (SSE) Push
                                                          │
                                                          ▼
                                            React 18 Desktop UI Stream
```

---

## 2. Configuration & Connection Pooling (`server/src/config/db.js`)

The backend initializes a shared connection pool and Prisma client instance:

```javascript
'use strict';

const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const config = require('./env');

// Shared connection pool for high-throughput operations
const pool = new Pool({ 
  connectionString: config.databaseUrl,
  max: 20,                   // Maximum pool size
  idleTimeoutMillis: 30000,  // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000 // Return error after 2s if connection cannot be established
});

// Singleton Prisma client instance
const prisma = new PrismaClient();

async function checkDb() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    return true;
  } catch (e) {
    return false;
  } finally {
    if (client) client.release();
  }
}

module.exports = { pool, prisma, checkDb };
```

---

## 3. Transactional Bulk Log Ingestion (`server/src/services/importService.js`)

High-volume log ingestion requires explicit database transactions (`BEGIN` ... `COMMIT`) and multi-row batch inserts to maintain database consistency and prevent partial imports:

```javascript
// Excerpt from server/src/services/importService.js
async function importFile(sourceId, filePath, batchSize = 500) {
  // 1. Create audit batch entry in RUNNING status via Prisma
  const batch = await prisma.importBatch.create({
    data: { sourceId, fileName: path.basename(file), status: 'RUNNING' },
  });

  const client = await pool.connect();
  try {
    // 2. Begin explicit ACID transaction
    await client.query('BEGIN');

    // Multi-row parameter chunking for fast batch insertion
    const flush = async () => {
      if (values.length === 0) return;
      const chunks = [];
      const params = [];
      let idx = 1;
      for (const v of values) {
        chunks.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
        params.push(v.sourceId, v.lineNo, v.loggedAt, v.level, v.message, v.ip, v.category, v.ruleId, JSON.stringify(v.raw), batch.id);
      }
      // Idempotent insertion: ON CONFLICT DO NOTHING preserves (source_id, line_no) PK integrity
      await client.query(
        `INSERT INTO log_entries (source_id, line_no, logged_at, level, message, ip, category, rule_id, raw, batch_id) 
         VALUES ${chunks.join(',')} 
         ON CONFLICT (source_id, line_no) DO NOTHING`,
        params
      );
      values.length = 0;
    };

    // Stream lines from disk and flush in batches...
    await flush();

    // 3. Commit transaction
    await client.query('COMMIT');

    // 4. Update audit batch record with metrics
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: 'COMPLETED', linesOk, linesTotal, finishedAt: new Date() },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: 'FAILED', finishedAt: new Date() },
    });
    throw err;
  } finally {
    client.release();
  }
}
```

---

## 4. Real-Time Alert Pub/Sub Event Pipeline (`server/src/services/alertListener.js`)

LogSentinel avoids expensive periodic HTTP polling by leveraging PostgreSQL's native **`LISTEN` / `NOTIFY`** mechanism:

1. A new alert record is evaluated and inserted into the `alerts` table.
2. The `trg_notify_new_alert` trigger fires, calling `notify_new_alert()`:
   ```sql
   PERFORM pg_notify('new_alert', json_build_object('id', NEW.id, 'title', NEW.title, 'severity', NEW.severity)::text);
   ```
3. The persistent Node.js listener captures the event and broadcasts it to connected desktop clients:

```javascript
// Excerpt from server/src/services/alertListener.js
const { Client } = require('pg');
const config = require('../config/env');
const sseClients = new Set();

function start() {
  const subscriber = new Client({ connectionString: config.databaseUrl });
  subscriber.connect();

  // Listen to PostgreSQL notification channel
  subscriber.query('LISTEN new_alert');

  subscriber.on('notification', (msg) => {
    if (msg.channel === 'new_alert') {
      const alert = JSON.parse(msg.payload);
      // Stream directly to desktop UI via Server-Sent Events (SSE)
      for (const client of sseClients) {
        client.write(`event: alert\ndata: ${JSON.stringify(alert)}\n\n`);
      }
    }
  });
}
```

---

## 5. API Controller Mapping & Database Operations

| REST API Endpoint | HTTP Method | Database Driver / Method | Underlying SQL / Operation |
|---|---|---|---|
| `/api/v1/auth/login` | `POST` | `prisma.user.findUnique()` | `SELECT * FROM users WHERE username = $1` |
| `/api/v1/sources` | `GET` | `prisma.source.findMany()` | `SELECT * FROM sources WHERE is_active = true ORDER BY name` |
| `/api/v1/logs` | `GET` | `pool.query()` | `SELECT * FROM log_entries WHERE level = $1 AND logged_at >= $2 ORDER BY logged_at DESC LIMIT $3 OFFSET $4` |
| `/api/v1/rules` | `POST` | `prisma.rule.create()` | `INSERT INTO rules (name, pattern, category, severity, created_by) VALUES (...) RETURNING *` |
| `/api/v1/alerts/:id/ack` | `PATCH` | `prisma.alert.update()` | `UPDATE alerts SET status = 'ACKNOWLEDGED', acknowledged_by = $1, acknowledged_at = now() WHERE id = $2` |
| `/api/v1/analytics/moving_average_errors` | `GET` | `pool.query()` (`logsentinel_viewer`) | `SELECT date_trunc('hour', logged_at), avg(count(*)) OVER (...) FROM log_entries GROUP BY 1` |
| `/api/v1/analytics/top_offenders` | `GET` | `pool.query()` (`logsentinel_viewer`) | `SELECT ip, count(*) AS failures FROM log_entries WHERE category = 'AUTH_FAILURE' GROUP BY ip ORDER BY failures DESC LIMIT 10` |

---

## 6. End-to-End Verification: UI Action to Database Reflection

To verify that actions taken in the application are faithfully reflected in PostgreSQL:
1. **Rule Creation in Desktop UI**: Administrator navigates to Settings → Adds rule *"SQL Injection Detection"* with pattern `(union|select|drop).*` and category `SQL_INJECTION`.
2. **Backend Controller**: Receives payload, validates category against regex `^[A-Z_]+$` matching database constraint `chk_rules_category`, and executes `prisma.rule.create()`.
3. **Database State**: PostgreSQL validates foreign key to `users(id)`, checks constraints, assigns next sequence integer (`id = 3`), and commits row.
4. **Immediate Visibility**: Running `SELECT * FROM rules WHERE category = 'SQL_INJECTION';` in `psql` immediately displays the newly created record.
