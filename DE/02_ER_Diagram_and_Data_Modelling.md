# 02. Entity-Relationship (ER) Diagram & Data Modelling

## 1. Relational Data Model Overview

The LogSentinel database architecture is composed of **seven relational entities** designed to model the complete lifecycle of log telemetry: from ingestion source tracking, regex classification, and policy thresholding, to threat alerting, user administration, and audit logging.

### Weak Entity Justification: `log_entries`
A foundational concept in relational database design is the **Weak Entity**. In LogSentinel:
- A `log_entries` record represents a single line parsed from a specific log source file.
- It possesses no globally unique natural surrogate identity on its own.
- It is existentially and identificationally dependent upon the `sources` entity.
- Its identity is established via a **composite primary key**: `(source_id, line_no)`. 
- If a source is purged (`ON DELETE CASCADE`), its associated log lines cease to exist.

---

## 2. Entities, Attributes, and Key Classifications

| Entity Name | Entity Type | Primary Key (PK) | Foreign Keys (FK) | Core Attributes & Data Types | Description & Business Purpose |
|---|---|---|---|---|---|
| **`users`** | Strong Entity | `id` (INT) | None | `username` (VARCHAR(50), UNIQUE)<br>`email` (VARCHAR(120), UNIQUE)<br>`password_hash` (TEXT)<br>`role` (ENUM: `ADMIN`, `VIEWER`)<br>`created_at` (TIMESTAMPTZ) | System administrators and security analysts with role-based dashboard access. |
| **`sources`** | Strong Entity | `id` (INT) | None | `name` (VARCHAR(80), UNIQUE)<br>`file_path` (TEXT, NULL)<br>`format` (ENUM: `GENERIC`, `ACCESS`)<br>`is_active` (BOOLEAN)<br>`created_at` (TIMESTAMPTZ) | Distinct log generation targets, servers, or file descriptors monitored by the app. |
| **`rules`** | Strong Entity | `id` (INT) | `created_by` → `users(id)` | `name` (VARCHAR(80), UNIQUE)<br>`pattern` (TEXT)<br>`flags` (VARCHAR(5))<br>`category` (VARCHAR(40))<br>`severity` (ENUM: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)<br>`is_active` (BOOLEAN)<br>`created_at` (TIMESTAMPTZ) | Classification regex patterns applied to incoming raw log lines to identify threat categories. |
| **`alert_policies`** | Strong Entity | `id` (INT) | None | `name` (VARCHAR(80), UNIQUE)<br>`category` (VARCHAR(40))<br>`threshold_count` (INT)<br>`window_seconds` (INT)<br>`group_by` (ENUM: `IP`, `SOURCE`)<br>`severity` (ENUM)<br>`is_active` (BOOLEAN) | Security threshold policies specifying window duration, count trigger limits, and aggregation dimension. |
| **`import_batches`** | Strong Entity | `id` (INT) | `source_id` → `sources(id)` | `file_name` (TEXT)<br>`status` (ENUM: `RUNNING`, `COMPLETED`, `FAILED`)<br>`lines_total` (INT)<br>`lines_ok` (INT)<br>`lines_failed` (INT)<br>`started_at` (TIMESTAMPTZ)<br>`finished_at` (TIMESTAMPTZ) | Audit trail of bulk file ingestion operations tracking processed lines and throughput. |
| **`log_entries`** | **Weak Entity** | `(source_id, line_no)` (Composite PK) | `source_id` → `sources(id)`<br>`rule_id` → `rules(id)`<br>`batch_id` → `import_batches(id)` | `logged_at` (TIMESTAMPTZ)<br>`level` (ENUM: `DEBUG`, `INFO`, `WARN`, `ERROR`, `CRITICAL`)<br>`message` (TEXT)<br>`ip` (INET, NULL)<br>`category` (VARCHAR(40), NULL)<br>`raw` (JSONB, NULL) | Parsed, normalized individual log entries with extracted IP, severity, and matching rule tag. |
| **`alerts`** | Strong Entity | `id` (INT) | `policy_id` → `alert_policies(id)`<br>`source_id` → `sources(id)`<br>`acknowledged_by` → `users(id)` | `title` (TEXT)<br>`severity` (ENUM)<br>`event_count` (INT)<br>`ip` (INET, NULL)<br>`dedupe_key` (VARCHAR(120))<br>`status` (ENUM: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`)<br>`window_start` (TIMESTAMPTZ)<br>`window_end` (TIMESTAMPTZ)<br>`triggered_at` (TIMESTAMPTZ)<br>`acknowledged_at` (TIMESTAMPTZ)<br>`details` (JSONB) | Security incidents raised when log frequency exceeds policy thresholds within defined time windows. |

---

## 3. Entity Relationships & Cardinality Analysis

### 1. `users` to `rules` (1:N)
- **Cardinality**: One User can create zero, one, or many Rules ($1 : N$). A Rule is authored by at most one User ($N : 1$).
- **Referential Action**: `ON DELETE SET NULL`. If an administrator account is deleted, the security rules created by that user remain active, with `created_by` set to NULL to preserve system integrity.

### 2. `users` to `alerts` (1:N - Triage Acknowledgment)
- **Cardinality**: One User can acknowledge multiple security Alerts ($1 : N$). An Alert can be acknowledged by zero or one User ($N : 1$ or $N : 0$).
- **Referential Action**: `ON DELETE SET NULL`. Preserves the alert audit trail if an analyst user is removed.

### 3. `sources` to `log_entries` (1:N - Identifying Relationship)
- **Cardinality**: One Source produces one or many Log Entries ($1 : N$). A Log Entry belongs to exactly one Source ($N : 1$).
- **Identifying Dependency**: `log_entries` inherits `source_id` as part of its primary key.
- **Referential Action**: `ON DELETE CASCADE`. If a source is decommissioned and deleted, all associated log lines are automatically removed.

### 4. `sources` to `import_batches` (1:N)
- **Cardinality**: One Source can have multiple import batch runs ($1 : N$). Each Batch belongs to exactly one Source ($N : 1$).
- **Referential Action**: `ON DELETE CASCADE`.

### 5. `sources` to `alerts` (1:N)
- **Cardinality**: One Source can be the origin of zero or many Alerts ($1 : N$).
- **Referential Action**: `ON DELETE SET NULL`. If a source is deleted, alerts generated from it remain for historical compliance.

### 6. `alert_policies` to `alerts` (1:N)
- **Cardinality**: One Alert Policy can trigger multiple security alerts over time ($1 : N$). An Alert is generated from exactly one Policy ($N : 1$).
- **Referential Action**: `ON DELETE CASCADE`.

### 7. `rules` to `log_entries` (1:N)
- **Cardinality**: One classification Rule can classify multiple Log Entries ($1 : N$). A Log Entry matches zero or one Rule ($N : 1$ or $N : 0$).
- **Referential Action**: `ON DELETE SET NULL`.

### 8. `import_batches` to `log_entries` (1:N)
- **Cardinality**: One Import Batch contains multiple Log Entries ($1 : N$). A Log Entry is linked to the batch in which it was imported ($N : 1$).
- **Referential Action**: `ON DELETE SET NULL`.

---

## 4. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ rules : "authors (1:N)"
    users ||--o{ alerts : "acknowledges (1:N)"
    sources ||--|{ log_entries : "identifies (1:N weak)"
    sources ||--o{ import_batches : "monitors (1:N)"
    sources ||--o{ alerts : "triggers (1:N)"
    alert_policies ||--|{ alerts : "generates (1:N)"
    rules ||--o{ log_entries : "classifies (1:N)"
    import_batches ||--o{ log_entries : "batches (1:N)"

    users {
        int id PK "autoincrement"
        varchar username UK "unique 50 chars"
        varchar email UK "unique 120 chars"
        text password_hash "bcrypt encrypted"
        Role role "ADMIN, VIEWER"
        timestamptz created_at "default now()"
    }

    sources {
        int id PK "autoincrement"
        varchar name UK "unique 80 chars"
        text file_path "nullable disk path"
        LogFormat format "GENERIC, ACCESS"
        boolean is_active "default true"
        timestamptz created_at "default now()"
    }

    rules {
        int id PK "autoincrement"
        varchar name UK "unique 80 chars"
        text pattern "regex pattern"
        varchar flags "regex flags (i, m, etc)"
        varchar category "UPPER_UNDERSCORE"
        Severity severity "LOW, MEDIUM, HIGH, CRITICAL"
        boolean is_active "default true"
        int created_by FK "references users(id)"
        timestamptz created_at "default now()"
    }

    alert_policies {
        int id PK "autoincrement"
        varchar name UK "unique 80 chars"
        varchar category "category to match"
        int threshold_count "count > 0"
        int window_seconds "1 to 86400"
        GroupBy group_by "IP or SOURCE"
        Severity severity "alert severity level"
        boolean is_active "default true"
    }

    import_batches {
        int id PK "autoincrement"
        int source_id FK "references sources(id)"
        text file_name "imported file name"
        BatchStatus status "RUNNING, COMPLETED, FAILED"
        int lines_total "total lines"
        int lines_ok "successfully parsed"
        int lines_failed "parse failures"
        timestamptz started_at "default now()"
        timestamptz finished_at "nullable"
    }

    log_entries {
        int source_id PK_FK "composite key (identifying)"
        int line_no PK "line sequence in source"
        int batch_id FK "references import_batches(id)"
        timestamptz logged_at "event timestamp"
        LogLevel level "DEBUG, INFO, WARN, ERROR, CRITICAL"
        text message "log payload text"
        inet ip "extracted IPv4/IPv6"
        varchar category "matched classification"
        int rule_id FK "references rules(id)"
        jsonb raw "structured JSON metadata"
    }

    alerts {
        int id PK "autoincrement"
        int policy_id FK "references alert_policies(id)"
        int source_id FK "references sources(id)"
        text title "descriptive alert title"
        Severity severity "incident severity"
        int event_count "matched event frequency"
        inet ip "offending IP address"
        varchar dedupe_key UK "policy_id + dedupe"
        AlertStatus status "OPEN, ACKNOWLEDGED, RESOLVED"
        timestamptz window_start "sliding window start"
        timestamptz window_end "sliding window end"
        timestamptz triggered_at "incident raise timestamp"
        int acknowledged_by FK "references users(id)"
        timestamptz acknowledged_at "triage timestamp"
        jsonb details "contextual threat payload"
    }
```

---

## 5. Relational Schema Representation (Crow's Foot Notation / Table Maps)

```
users (
    id [PK], username [UK], email [UK], password_hash, role, created_at
)

sources (
    id [PK], name [UK], file_path, format, is_active, created_at
)

rules (
    id [PK], name [UK], pattern, flags, category, severity, is_active, 
    created_by [FK -> users.id], created_at
)

alert_policies (
    id [PK], name [UK], category, threshold_count, window_seconds, group_by, 
    severity, is_active
)

import_batches (
    id [PK], source_id [FK -> sources.id], file_name, status, 
    lines_total, lines_ok, lines_failed, started_at, finished_at
)

log_entries (
    source_id [PK, FK -> sources.id], 
    line_no [PK], 
    batch_id [FK -> import_batches.id], 
    logged_at, level, message, ip, category, 
    rule_id [FK -> rules.id], 
    raw
)

alerts (
    id [PK], 
    policy_id [FK -> alert_policies.id], 
    source_id [FK -> sources.id], 
    title, severity, event_count, ip, dedupe_key, status, 
    window_start, window_end, triggered_at, 
    acknowledged_by [FK -> users.id], 
    acknowledged_at, details
)
```
