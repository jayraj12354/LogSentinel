# 03. Database Normalization Documentation

## 1. Normalization Objectives & Anomaly Analysis

Normalization is the formal mathematical process of decomposing a relational database schema to eliminate data redundancy and prevent **update, insertion, and deletion anomalies** while preserving data dependencies and referential integrity.

### Data Anomalies in an Unnormalized Log Table (UNF)
Consider a naive, unnormalized single-table design (`flat_log_monitoring`):
`flat_log_monitoring(source_name, source_file_path, line_no, logged_at, level, message, ip, rule_name, rule_pattern, rule_category, policy_name, threshold_count, window_seconds, alert_title, alert_status, user_name, user_email)`

If stored as a single flat table:
1. **Insertion Anomaly**: We cannot create a new classification rule or alert policy without inserting an actual log line. A newly registered log source cannot be recorded in the system until its first log line is generated.
2. **Deletion Anomaly**: If we purge old log records to free storage space, we unintentionally delete the log source metadata, classification rules, and policy configurations that were only stored in those rows.
3. **Update Anomaly**: If a log source's file path or a rule's severity changes, we must update millions of historical log rows. If any row is missed, data becomes inconsistent.

---

## 2. Functional Dependencies (FDs)

Let the set of functional dependencies across the LogSentinel application domain be:

- **$FD_1$ (User Identity)**:  
  `users.id` $\to$ `{username, email, password_hash, role, created_at}`  
  `users.username` $\to$ `{id, email, password_hash, role, created_at}`  
  `users.email` $\to$ `{id, username, password_hash, role, created_at}`

- **$FD_2$ (Source Definition)**:  
  `sources.id` $\to$ `{name, file_path, format, is_active, created_at}`  
  `sources.name` $\to$ `{id, file_path, format, is_active, created_at}`

- **$FD_3$ (Rule Specification)**:  
  `rules.id` $\to$ `{name, pattern, flags, category, severity, is_active, created_by, created_at}`  
  `rules.name` $\to$ `{id, pattern, flags, category, severity, is_active, created_by, created_at}`

- **$FD_4$ (Alert Policy Thresholds)**:  
  `alert_policies.id` $\to$ `{name, category, threshold_count, window_seconds, group_by, severity, is_active}`  
  `alert_policies.name` $\to$ `{id, category, threshold_count, window_seconds, group_by, severity, is_active}`

- **$FD_5$ (Import Batch Audit)**:  
  `import_batches.id` $\to$ `{source_id, file_name, status, lines_total, lines_ok, lines_failed, started_at, finished_at}`

- **$FD_6$ (Log Line Telemetry - Weak Entity)**:  
  `{source_id, line_no}` $\to$ `{batch_id, logged_at, level, message, ip, category, rule_id, raw}`

- **$FD_7$ (Security Alert Incident)**:  
  `alerts.id` $\to$ `{policy_id, source_id, title, severity, event_count, ip, dedupe_key, status, window_start, window_end, triggered_at, acknowledged_by, acknowledged_at, details}`  
  `{policy_id, dedupe_key}` $\to$ `{id, source_id, title, severity, event_count, ip, status, window_start, window_end, triggered_at, acknowledged_by, acknowledged_at, details}`

---

## 3. Step-by-Step Normalization Transformations

### Step 1: Transformation from Unnormalized Form (UNF) to 1NF

**Rule of 1NF**:
1. All column values must be **atomic** (indivisible single values; no repeating groups, arrays, or comma-separated lists).
2. A distinct Primary Key must be identified for every relation.

**Transformations**:
- In raw log files, log lines often contain nested comma-separated IP lists (e.g., `X-Forwarded-For: 10.0.0.1, 192.168.1.1`) or multi-value regex flags. In 1NF, extracted IP addresses are reduced to single atomic `INET` entries.
- Log message strings, timestamps, and severity levels are split into distinct atomic scalar columns: `logged_at`, `level`, `message`, `ip`.
- Primary keys are established: `(source_id, line_no)` uniquely identifies each log line.

**1NF State**:
At 1NF, repeating groups are eliminated, but composite key relations still contain **partial functional dependencies**.

---

### Step 2: Transformation from 1NF to Second Normal Form (2NF)

**Rule of 2NF**:
1. The relation must be in 1NF.
2. Every non-prime attribute must be **fully functionally dependent** on the whole candidate key (no **Partial Dependencies** where a non-key attribute depends on only part of a composite primary key).

**Partial Dependency in 1NF Composite Key Table**:
Consider the 1NF table:
`log_records(source_id, line_no, source_name, source_format, logged_at, level, message, ip)`
- Candidate Key: `{source_id, line_no}`
- Notice the dependencies:
  - `{source_id, line_no}` $\to$ `{logged_at, level, message, ip}` (Full Dependency)
  - `source_id` $\to$ `{source_name, source_format}` (**Partial Dependency!** Depends only on `source_id`, not `line_no`).

**Resolution to achieve 2NF**:
Decompose the relation into two separate relations:
1. `sources`: Key is `id` ($FD_2$). Non-key attributes `{name, file_path, format}` depend fully on `id`.
2. `log_entries`: Key is `{source_id, line_no}`. Non-key attributes `{logged_at, level, message, ip}` depend on the full composite key `{source_id, line_no}`.

**Resulting 2NF Schema**:
All partial dependencies on candidate keys are completely removed.

---

### Step 3: Transformation from 2NF to Third Normal Form (3NF)

**Rule of 3NF**:
1. The relation must be in 2NF.
2. There must be **no transitive dependencies** (no non-prime attribute is functionally dependent on another non-prime attribute: $X \to Y \to Z$ where $X$ is a superkey, $Y$ is not a superkey, and $Z$ is a non-prime attribute).

**Transitive Dependencies in 2NF Tables**:

#### Case A: Classification Rules & Creators
If `rules` contained:
`rules(id, name, pattern, category, severity, created_by_user_id, user_email, user_role)`
- `id` $\to$ `created_by_user_id`
- `created_by_user_id` $\to$ `{user_email, user_role}`
- Therefore, `{user_email, user_role}` is transitively dependent on `rules.id` through `created_by_user_id`.
- **Resolution**: Extract `users(id, username, email, role, ...)` into its own entity. In `rules`, retain only the foreign key `created_by REFERENCES users(id)`.

#### Case B: Alerts and Alert Policies
If `alerts` contained:
`alerts(id, policy_id, policy_name, threshold_count, window_seconds, title, event_count, status)`
- `id` $\to$ `policy_id`
- `policy_id` $\to$ `{policy_name, threshold_count, window_seconds}`
- Transitive dependency exists: `id` $\to$ `policy_id` $\to$ `{threshold_count, window_seconds}`.
- If threshold policies change, modifying them in `alerts` would produce an update anomaly across past alerts.
- **Resolution**: Extract `alert_policies(id, name, threshold_count, window_seconds, ...)` and store only the foreign key `policy_id REFERENCES alert_policies(id)` in `alerts`.

#### Case C: Log Entries and Matched Rules
In `log_entries`, we do not store `rule_name`, `rule_pattern`, or `rule_severity`. We store only `rule_id REFERENCES rules(id)`. This prevents transitive dependency on the rule's attributes.

---

## 4. Boyce-Codd Normal Form (BCNF) Analysis

**Rule of BCNF**:
A relation is in BCNF if and only if for every non-trivial functional dependency $X \to Y$, $X$ is a **superkey**.

- In `users`: Determinants are `id`, `username`, and `email`. All three are candidate keys / superkeys (`id` is PK, `username` and `email` are UNIQUE). Hence, BCNF holds.
- In `sources`: Determinants are `id` (PK) and `name` (UNIQUE). Both are superkeys. BCNF holds.
- In `rules`: Determinants are `id` (PK) and `name` (UNIQUE). Both are superkeys. BCNF holds.
- In `alert_policies`: Determinants are `id` (PK) and `name` (UNIQUE). Both are superkeys. BCNF holds.
- In `import_batches`: Determinant is `id` (PK). BCNF holds.
- In `log_entries`: The only determinant for entry attributes is the composite key `{source_id, line_no}`, which is the PK. BCNF holds.
- In `alerts`: Determinants are `id` (PK) and `{policy_id, dedupe_key}` (UNIQUE constraint). Both are superkeys. BCNF holds.

**Conclusion**: The LogSentinel relational database schema satisfies **3NF and BCNF**.

---

## 5. Justified Semi-Structured Field (`raw JSONB`)

In `log_entries`, the column `raw JSONB` is maintained:
- **Relational Purist Question**: Does storing JSON violate 1NF atomicity?
- **Engineering Justification**: In modern database systems (PostgreSQL 9.4+), `JSONB` is a binary, indexed data type representing structured key-value maps. LogSentinel stores normalized, query-critical fields (`logged_at`, `level`, `ip`, `category`) as dedicated first-class relational columns with B-Tree and GIN indexes. The `raw` column holds variable HTTP request headers, user-agent strings, and payload fragments that vary drastically across web servers (Nginx, Apache, Envoy, Syslog). 
- Storing these unpredictable headers in a typed `JSONB` document avoids creating a sparse, unmanageable table with 50+ nullable columns while maintaining strict 3NF for all relational business entities.
