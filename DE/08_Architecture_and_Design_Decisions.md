# 08. Database Architecture and Implementation Decisions

## 1. System Architecture Overview

The LogSentinel database architecture is engineered to balance **high-throughput telemetry ingestion** with **responsive, complex analytical querying** and **guaranteed data integrity**.

Key architectural pillars:
1. **Tiered Access Model**: Dual-role separation isolating transactional ingestion from analytical dashboard queries.
2. **Defensive Integrity Enforcement**: Multi-layer constraint validation (PostgreSQL domain `CHECK` constraints, foreign key referential actions, unique deduplication constraints).
3. **Optimized Indexing Strategy**: Specialized B-Tree, composite, and GIN trigram indexes tailored to query patterns.
4. **Horizontal Volume Scaling Path**: Declarative range partitioning strategy supporting multi-million row retention.

---

## 2. Data Integrity & Anomaly Prevention

### 2.1 Deduplication & Idempotent Ingestion
- **Challenge**: Network retries or re-importing the same log file could flood the database with duplicate records or raise redundant alerts.
- **Implementation Decision**:
  - **Log Entry Keying**: `(source_id, line_no)` composite primary key paired with `INSERT ... ON CONFLICT (source_id, line_no) DO NOTHING`. Re-running an import batch skips existing lines with zero error overhead.
  - **Alert Deduplication**: Unique constraint `uq_alerts_policy_dedupe UNIQUE (policy_id, dedupe_key)` where `dedupe_key` combines policy ID, offending IP, and time-slice window. If an attack persists across consecutive evaluation ticks, the existing alert record is updated rather than spawning duplicate notifications.

### 2.2 Handling Missing or Invalid Data
- **IP Address Sanitization**: Parsed log lines with unparseable or absent IPs store `NULL` in the `ip INET` column. The `INET` data type strictly rejects invalid IP strings at the database level.
- **State Machine Integrity**: Domain constraint `chk_alert_ack CHECK (status = 'OPEN' OR acknowledged_at IS NOT NULL)` ensures that no analyst can transition an incident to `ACKNOWLEDGED` or `RESOLVED` without recording an audit timestamp.

---

## 3. Indexing Architecture & Query Acceleration

Every index in LogSentinel was introduced to eliminate sequential table scans on critical execution paths:

| Index Name | Index Type | Target Column(s) | Business Query Accelerated |
|---|---|---|---|
| `idx_log_entries_logged_at` | B-Tree | `logged_at DESC` | Temporal log filtering, sliding window alert evaluation, time-decay purging. |
| `idx_log_entries_category_time` | Composite B-Tree | `(category, logged_at DESC)` | Category-specific dashboards (e.g. `WHERE category = 'AUTH_FAILURE'`). |
| `idx_log_entries_ip` | Partial B-Tree | `ip WHERE ip IS NOT NULL` | Offender grouping (`GROUP BY ip`) and set operations (`INTERSECT`). |
| `idx_alerts_status_time` | Composite B-Tree | `(status, triggered_at DESC)` | Incident response triage queue (`WHERE status = 'OPEN'`). |
| `idx_log_entries_message_trgm` | GIN Trigram | `message gin_trgm_ops` | Substring, `LIKE '%query%'`, and regex searches across millions of log messages. |

---

## 4. Scalability & High-Volume Strategy: Declarative Range Partitioning

As an enterprise deployment grows, log tables expand by gigabytes daily. A single monolithic table suffers from degraded index traversal times and slow `DELETE` operations during maintenance.

### Proposed Architecture: Range Partitioning by `logged_at`
In a scaled deployment, `log_entries` transitions to a **Declarative Partitioned Table**:

```sql
-- Partitioned Master Table Definition
CREATE TABLE log_entries_partitioned (
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    line_no INTEGER NOT NULL,
    batch_id INTEGER REFERENCES import_batches(id) ON DELETE SET NULL,
    logged_at TIMESTAMPTZ(6) NOT NULL,
    level "LogLevel" NOT NULL,
    message TEXT NOT NULL,
    ip INET,
    category VARCHAR(40),
    rule_id INTEGER REFERENCES rules(id) ON DELETE SET NULL,
    raw JSONB,
    PRIMARY KEY (source_id, line_no, logged_at)
) PARTITION BY RANGE (logged_at);

-- Monthly Partitions
CREATE TABLE log_entries_2026_11 PARTITION OF log_entries_partitioned
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE log_entries_2026_12 PARTITION OF log_entries_partitioned
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
```

### Advantages of Partitioning:
1. **Partition Pruning**: Queries with temporal filters (`WHERE logged_at >= '2026-11-20'`) automatically skip unrelated monthly partitions, reducing I/O by orders of magnitude.
2. **Instant Archival via `DROP TABLE`**: Purging logs older than 90 days executes via `DROP TABLE log_entries_2026_08;` which completes instantaneously and reclaims disk space immediately without table fragmentation or heavy `VACUUM` overhead.

---

## 5. Security & Principle of Least Privilege

To safeguard sensitive system data, LogSentinel isolates privileges across two distinct database users:

```sql
-- Application User: Has DDL/DML access for regular operations
logsentinel_app (login: 'app_pass')
├── INSERT / UPDATE / DELETE on log_entries, alerts, import_batches
└── Execution of triggers and sequence advances

-- Viewer User: Strictly Read-Only for dashboards and analytics
logsentinel_viewer (login: 'viewer_pass')
├── SELECT on log_entries, alerts, alert_policies, sources, rules
└── Column-Level Security: REVOKE SELECT ON users(password_hash)
```

By ensuring that the analytics dashboard connection pool uses `logsentinel_viewer`, even if a SQL injection vulnerability were introduced in an analytical query, attackers cannot read bcrypt password hashes or modify database records.
