# 01. Database Selection and Justification

## 1. Selected Database
**PostgreSQL 16 (Object-Relational Database Management System - ORDBMS)**

---

## 2. Nature of the Application and Stored Data

LogSentinel is an enterprise-grade desktop security monitoring system designed to ingest, parse, classify, analyze, and triage system and application logs in real-time. The application processes several distinct categories of data:

1. **System & Security Telemetry (High Volume, Time-Ordered)**:
   - Structured log records extracted from raw `.log` files (Apache Access, Syslog, Auth logs).
   - Attributes: Timestamp (`timestamptz`), Severity (`LogLevel`: `DEBUG`, `INFO`, `WARN`, `ERROR`, `CRITICAL`), Source reference, Line number, IP address (`inet`), Category (`AUTH_FAILURE`, `PORT_SCAN`, `SQL_INJECTION`), and Raw payload (`jsonb`).
2. **Metadata & Configuration (Low Volume, High Integrity)**:
   - Log sources (file system paths, parsing formats).
   - Regex-based classification rules with severity tagging.
   - Threshold-based detection policies (sliding time windows, event count thresholds, aggregation dimensions).
3. **Operational & Security State (Transactional, Relational)**:
   - Alert triage lifecycle (`OPEN` → `ACKNOWLEDGED` → `RESOLVED`), acknowledging user identities, trigger timestamps, deduplication keys.
   - User authentication and access control credentials (hashed passwords, roles: `ADMIN`, `VIEWER`).
   - Batch ingestion auditing (total lines, succeeded lines, failed lines, processing duration).

---

## 3. Justification of PostgreSQL over MongoDB

While both PostgreSQL and MongoDB are industry-standard database engines, PostgreSQL was deliberately selected for LogSentinel based on the following architectural requirements:

| Evaluation Dimension | PostgreSQL (Selected) | MongoDB (Alternative) | LogSentinel Requirement & Impact |
|---|---|---|---|
| **Data Integrity & Consistency** | **Strict ACID Compliance** across all tables and transactions. Domain check constraints, foreign key cascades, and unique constraints. | Document-level atomicity; multi-document transactions exist but carry performance overhead and lack schema-enforced FK validation. | **Critical**: An alert policy or audit record must never reference a non-existent log source or user. Referential integrity must be guaranteed at the database level. |
| **Complex Analytical Queries** | **Advanced SQL & Window Functions**: Native support for `LAG()`, `LEAD()`, `AVG() OVER (ROWS BETWEEN ...)`, `date_trunc()`, and `FILTER (WHERE ...)`. | Aggregation pipeline (`$facet`, `$bucket`, `$setWindowFields`) is verbose, complex to maintain, and slower on ad-hoc sliding window triage. | **Critical**: LogSentinel computes moving averages of errors per hour, detects fail-then-success sequences within sliding 10-minute windows, and identifies burst attack patterns. |
| **Real-Time Notification & Event Streaming** | **Native `LISTEN` / `NOTIFY`**: Database triggers invoke `pg_notify()` immediately when an alert is inserted, pushing real-time payloads to the Node.js backend without polling. | Change Streams require an active Replica Set, adding deployment complexity to a desktop-bundled database. | **High**: Desktop alerts require sub-second UI delivery. PostgreSQL pub/sub enables zero-polling Server-Sent Events (SSE). |
| **Specialized Network & Search Data Types** | **Native `INET` type** for IP addresses (supporting subnet searches, CIDR containment `<<=`) and **`pg_trgm` GIN indexes** for substring/regex log searching. | IP addresses are stored as plain strings; CIDR and IP range queries require custom application logic. Regex searches on unbounded text require heavy CPU. | **High**: Security triage relies heavily on IP grouping, subnet filtering, and fast regex pattern matching across millions of log lines. |
| **Security & Access Control (DCL)** | **Role-Based Column & Table Security**: Supports distinct roles (`logsentinel_app` with DML/DDL vs. `logsentinel_viewer` with read-only access and explicit `REVOKE SELECT ON users(password_hash)`). | Role-based security in MongoDB is database/collection-scoped; column/field-level redaction requires aggregation pipelines or enterprise extensions. | **High**: Demonstrates the principle of least privilege: analytical dashboard queries connect via a read-only role completely isolated from credential hashes. |
| **Hybrid Document Storage** | **Native `JSONB` support**: Allows semi-structured or varying raw log headers to be stored without sacrificing relational integrity for core fields. | Native BSON/JSON document storage. | **Optimal**: PostgreSQL provides the best of both worlds: strict relational integrity for relations (`users`, `sources`, `alerts`, `rules`) combined with `jsonb` flexibility for unparsed raw attributes. |

---

## 4. Suitability Summary

LogSentinel's functional requirements demand **relational modeling, strict referential integrity, sophisticated time-series analytical queries, and event-driven notifications**. 

- MongoDB would allow rapid schema variations, but would force the application tier to manually maintain referential integrity (e.g., ensuring orphaned logs or alerts do not occur when sources or policies are deleted).
- Furthermore, calculating sliding window metrics and attack correlation sequences (such as an SSH failure immediately followed by a successful login from the same IP) is computationally elegant and fast in PostgreSQL using SQL window functions, whereas MongoDB's aggregation pipelines for time-interval joins require complex `$lookup` with pipeline stages.

Therefore, **PostgreSQL** is the most architecturally sound, robust, and mathematically normalized choice for the LogSentinel project.
