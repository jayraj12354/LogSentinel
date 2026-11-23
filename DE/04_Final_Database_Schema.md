# 04. Final Database Schema (DDL Specification)

This document contains the complete, production-grade **Data Definition Language (DDL)** script implementing the normalized LogSentinel database in PostgreSQL 16. It includes enum definitions, relational tables, integrity constraints, indexes, triggers, and role-based security configurations.

---

## 1. Custom Enumerated Types (ENUMs)

```sql
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');
CREATE TYPE "LogFormat" AS ENUM ('GENERIC', 'ACCESS');
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL');
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');
CREATE TYPE "BatchStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "GroupBy" AS ENUM ('IP', 'SOURCE');
```

---

## 2. Table Schemas with Primary & Foreign Key Constraints

### 2.1 `users` Table
Stores authenticated operators, administrators, and analysts.
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role "Role" NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 `sources` Table
Defines log file origins, network collectors, or monitoring targets.
```sql
CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    file_path TEXT,
    format "LogFormat" NOT NULL DEFAULT 'GENERIC',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 `rules` Table
Stores regex classification patterns for tag assignment and severity rating.
```sql
CREATE TABLE rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    pattern TEXT NOT NULL,
    flags VARCHAR(5) NOT NULL DEFAULT 'i',
    category VARCHAR(40) NOT NULL,
    severity "Severity" NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 `alert_policies` Table
Defines threshold limits, sliding window durations, and grouping criteria.
```sql
CREATE TABLE alert_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    category VARCHAR(40) NOT NULL,
    threshold_count INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    group_by "GroupBy" NOT NULL DEFAULT 'IP',
    severity "Severity" NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);
```

### 2.5 `import_batches` Table
Tracks audit information for bulk log file ingestion runs.
```sql
CREATE TABLE import_batches (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    status "BatchStatus" NOT NULL DEFAULT 'RUNNING',
    lines_total INTEGER NOT NULL DEFAULT 0,
    lines_ok INTEGER NOT NULL DEFAULT 0,
    lines_failed INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ(6)
);
```

### 2.6 `log_entries` Table (Weak Entity)
Stores individual parsed log events identified by the composite key `(source_id, line_no)`.
```sql
CREATE TABLE log_entries (
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
    PRIMARY KEY (source_id, line_no)
);
```

### 2.7 `alerts` Table
Stores actionable security incidents evaluated against active policies.
```sql
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER NOT NULL REFERENCES alert_policies(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    severity "Severity" NOT NULL,
    event_count INTEGER NOT NULL,
    ip INET,
    dedupe_key VARCHAR(120) NOT NULL,
    status "AlertStatus" NOT NULL DEFAULT 'OPEN',
    window_start TIMESTAMPTZ(6) NOT NULL,
    window_end TIMESTAMPTZ(6) NOT NULL,
    triggered_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ(6),
    details JSONB,
    CONSTRAINT uq_alerts_policy_dedupe UNIQUE (policy_id, dedupe_key)
);
```

---

## 3. Domain & Business Logic Integrity Constraints (`CHECK`)

```sql
-- Ensure email addresses strictly follow valid RFC syntax
ALTER TABLE users ADD CONSTRAINT chk_users_email 
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Ensure classification categories are formatted in standard UPPER_UNDERSCORE
ALTER TABLE rules ADD CONSTRAINT chk_rules_category 
    CHECK (category ~ '^[A-Z_]+$');

-- Ensure regex flags only contain valid JavaScript / PCRE modifiers
ALTER TABLE rules ADD CONSTRAINT chk_rules_flags 
    CHECK (flags ~ '^[gimsuy]*$');

-- Ensure policy thresholds require at least 1 offending event
ALTER TABLE alert_policies ADD CONSTRAINT chk_policy_threshold 
    CHECK (threshold_count > 0);

-- Ensure policy sliding windows range between 1 second and 24 hours (86,400s)
ALTER TABLE alert_policies ADD CONSTRAINT chk_policy_window 
    CHECK (window_seconds BETWEEN 1 AND 86400);

-- Ensure batch processing metrics cannot be negative
ALTER TABLE import_batches ADD CONSTRAINT chk_batch_counts 
    CHECK (lines_total >= 0 AND lines_ok >= 0 AND lines_failed >= 0);

-- Ensure log file line numbers are strictly positive integers
ALTER TABLE log_entries ADD CONSTRAINT chk_log_entries_line_no 
    CHECK (line_no > 0);

-- Ensure chronological integrity of sliding alert windows
ALTER TABLE alerts ADD CONSTRAINT chk_alert_window 
    CHECK (window_end >= window_start);

-- Enforce state machine integrity: non-OPEN alerts MUST record an acknowledgment timestamp
ALTER TABLE alerts ADD CONSTRAINT chk_alert_ack 
    CHECK (status = 'OPEN' OR acknowledged_at IS NOT NULL);
```

---

## 4. Performance Indexes

```sql
-- Fast temporal range filtering for dashboard views and sliding window evaluation
CREATE INDEX idx_log_entries_logged_at 
    ON log_entries(logged_at DESC);

-- Composite index optimizing category filtering sorted by timestamp
CREATE INDEX idx_log_entries_category_time 
    ON log_entries(category, logged_at DESC);

-- Accelerated lookup for IP-based threat triage and set operations
CREATE INDEX idx_log_entries_ip 
    ON log_entries(ip) 
    WHERE ip IS NOT NULL;

-- Accelerated status-based alert queues and triage dashboard sorting
CREATE INDEX idx_alerts_status_time 
    ON alerts(status, triggered_at DESC);

-- Trigram GIN index for high-speed free-text and regex substring search across raw messages
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_log_entries_message_trgm 
    ON log_entries USING gin (message gin_trgm_ops);
```

---

## 5. Event-Driven Database Triggers (Pub/Sub)

LogSentinel employs a PostgreSQL database trigger to broadcast new security incidents to the backend daemon in real-time using `pg_notify`.

```sql
-- PL/pgSQL Notification Function
CREATE OR REPLACE FUNCTION notify_new_alert() 
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'new_alert',
    json_build_object(
      'id', NEW.id,
      'severity', NEW.severity,
      'title', NEW.title,
      'ip', host(NEW.ip),
      'eventCount', NEW.event_count,
      'triggeredAt', NEW.triggered_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER INSERT Trigger on alerts table
CREATE TRIGGER trg_notify_new_alert
AFTER INSERT ON alerts
FOR EACH ROW 
EXECUTE FUNCTION notify_new_alert();
```

---

## 6. Database Control Language (DCL) & Security Roles

Demonstrating the principle of least privilege, two distinct database roles are enforced:

```sql
-- Role 1: Application Backend Role (Read/Write, DDL, Ingestion)
CREATE ROLE logsentinel_app LOGIN PASSWORD 'app_pass';
GRANT CONNECT ON DATABASE logsentinel TO logsentinel_app;
GRANT USAGE, CREATE ON SCHEMA public TO logsentinel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO logsentinel_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO logsentinel_app;

-- Role 2: Dedicated Read-Only Analytics Role (Principle of Least Privilege)
CREATE ROLE logsentinel_viewer LOGIN PASSWORD 'viewer_pass';
GRANT CONNECT ON DATABASE logsentinel TO logsentinel_viewer;
GRANT USAGE ON SCHEMA public TO logsentinel_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO logsentinel_viewer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO logsentinel_viewer;

-- Column-Level Security: Revoke credential access from viewer role
REVOKE SELECT ON users FROM logsentinel_viewer;
GRANT SELECT (id, username, email, role, created_at) ON users TO logsentinel_viewer;
```
