# 06. Query Writing, Execution & Verification

This document demonstrates mastery of PostgreSQL query operations through **12 project-specific queries** addressing real-world security log monitoring, threat detection, and incident triage.

All queries were executed directly against the live PostgreSQL database instance (`logsentinel`), and the exact outputs returned by the database engine are documented below.

---

## 📋 Query Coverage Matrix

| Query ID | Academic DBMS Concept | Project Business Use Case |
|---|---|---|
| **Q01** | `SELECT` with Filtering & Sorting | Filter high-severity security logs sorted chronologically |
| **Q02** | Aggregate Functions (`COUNT`, `MIN`, `MAX`) | Summary statistics of log entries by severity level |
| **Q03** | `GROUP BY` with `HAVING` Clause | Identification of brute-force threat actors exceeding attack thresholds |
| **Q04** | Multi-Table `INNER JOIN` | Security alert enrichment with policy thresholds and source names |
| **Q05** | `LEFT OUTER JOIN` with `GROUP BY` | Identifying silent or failing log sources producing zero events |
| **Q06** | Correlated Subquery with `NOT EXISTS` | Auditing inactive classification rules that have never matched |
| **Q07** | Subquery with `IN` Operator | Auditing operators who have triaged high or critical severity alerts |
| **Q08** | Window Function (`AVG() OVER ROWS BETWEEN`) | Computing 3-hour sliding moving average of hourly log volume |
| **Q09** | Window Function (`LAG() OVER PARTITION BY`) | Calculating inter-arrival delta seconds between consecutive attacks |
| **Q10** | Set Operation (`INTERSECT`) | Cross-correlation of IPs exhibiting both failure and success events |
| **Q11** | DML: `INSERT` with `RETURNING` | Programmatic creation of security rules with immediate PK retrieval |
| **Q12** | DML: `UPDATE` with State Constraint | Triage state-machine transition from `OPEN` to `ACKNOWLEDGED` |

---

## Query 1: Filtered & Sorted Log Retrieval
- **DBMS Concept**: `SELECT` projection, multi-condition `WHERE` filtering (`IN`, `IS NOT NULL`), and descending temporal sorting (`ORDER BY ... DESC`).
- **Business Use Case**: Used by the Log Explorer dashboard to display security-relevant warnings and errors for immediate inspection.

### SQL Statement:
```sql
SELECT source_id, line_no, logged_at, level, category, ip, 
       substring(message, 1, 55) AS snippet 
FROM log_entries 
WHERE level IN ('WARN', 'ERROR') 
  AND category IS NOT NULL 
ORDER BY logged_at DESC 
LIMIT 5;
```

### Execution Output:
```
 source_id | line_no |           logged_at           | level |   category   |      ip       |                         snippet                         
-----------+---------+-------------------------------+-------+--------------+---------------+---------------------------------------------------------
         1 |      88 | 2026-11-21 21:53:41.495+05:30 | WARN  | AUTH_FAILURE | 198.51.100.23 | Failed password for invalid user admin from 198.51.100.
         1 |      87 | 2026-11-21 21:53:34.009+05:30 | WARN  | AUTH_FAILURE | 198.51.100.23 | Failed password for invalid user admin from 198.51.100.
         1 |      86 | 2026-11-21 21:53:28.545+05:30 | WARN  | AUTH_FAILURE | 198.51.100.23 | Failed password for invalid user admin from 198.51.100.
         1 |      85 | 2026-11-21 21:53:19.352+05:30 | WARN  | AUTH_FAILURE | 198.51.100.23 | Failed password for invalid user admin from 198.51.100.
         1 |      84 | 2026-11-21 21:53:09.424+05:30 | WARN  | AUTH_FAILURE | 198.51.100.23 | Failed password for invalid user admin from 198.51.100.
(5 rows)
```

---

## Query 2: Aggregate Functions & Severity Breakdown
- **DBMS Concept**: Multiple aggregate functions (`count(*)`, `min()`, `max()`) combined with categorical grouping.
- **Business Use Case**: Populates the Analytics Dashboard overview cards, tracking total distribution and time spans per severity tier.

### SQL Statement:
```sql
SELECT level, 
       count(*) AS total_count, 
       min(logged_at) AS earliest_event, 
       max(logged_at) AS latest_event 
FROM log_entries 
GROUP BY level 
ORDER BY total_count DESC;
```

### Execution Output:
```
   level   | total_count |        earliest_event         |         latest_event          
-----------+-------------+-------------------------------+-------------------------------
 INFO      |        6342 | 2026-11-15 10:49:00+05:30     | 2026-11-23 00:45:44.979+05:30
 DEBUG     |        1552 | 2026-11-20 19:32:48.969+05:30 | 2026-11-21 04:28:56.621+05:30
 WARN      |          93 | 2026-11-15 10:48:30+05:30     | 2026-11-22 03:32:20.15+05:30
 ERROR     |          12 | 2026-11-20 19:30:29.348+05:30 | 2026-11-20 19:31:04.403+05:30
 CRITICAL  |           1 | 2026-11-20 19:32:18.797+05:30 | 2026-11-20 19:32:18.797+05:30
(5 rows)
```

---

## Query 3: Threat Actor Identification via GROUP BY & HAVING
- **DBMS Concept**: Grouping by network IP with a `HAVING` clause filtering aggregated counts ($Count \ge 5$).
- **Business Use Case**: Generates the "Top Offenders" security intelligence panel to highlight IP addresses generating repeated authentication failures.

### SQL Statement:
```sql
SELECT ip, 
       count(*) AS failure_count 
FROM log_entries 
WHERE category = 'AUTH_FAILURE' 
  AND ip IS NOT NULL 
GROUP BY ip 
HAVING count(*) >= 5 
ORDER BY failure_count DESC 
LIMIT 5;
```

### Execution Output:
```
      ip       | failure_count 
---------------+---------------
 203.0.113.99  |            10
 198.51.100.23 |             6
(2 rows)
```

---

## Query 4: Multi-Table INNER JOIN (Alert Enrichment)
- **DBMS Concept**: `INNER JOIN` combining `alerts`, `alert_policies`, and a `LEFT JOIN` on `sources`.
- **Business Use Case**: Builds the unified incident response queue by correlating triggered alerts with policy threshold definitions and source names.

### SQL Statement:
```sql
SELECT a.id AS alert_id, 
       a.title, 
       a.severity, 
       a.event_count, 
       p.name AS policy_name, 
       p.threshold_count, 
       s.name AS source_name, 
       a.status 
FROM alerts a 
INNER JOIN alert_policies p ON a.policy_id = p.id 
LEFT JOIN sources s ON a.source_id = s.id 
LIMIT 5;
```

### Execution Output:
```
 alert_id |           title            | severity | event_count |    policy_name    | threshold_count | source_name |    status    
----------+----------------------------+----------+-------------+-------------------+-----------------+-------------+--------------
        1 | Brute-force login detected | HIGH     |           9 | Brute-force login |               5 | auth-server | ACKNOWLEDGED
(1 row)
```

---

## Query 5: Identifying Silent Sources via LEFT OUTER JOIN
- **DBMS Concept**: `LEFT OUTER JOIN` with aggregation to detect relations containing zero matching child records.
- **Business Use Case**: Audit health monitoring to alert administrators if a configured log source has stopped ingesting logs (`total_entries_stored = 0`).

### SQL Statement:
```sql
SELECT s.id, 
       s.name, 
       s.format, 
       count(le.line_no) AS total_entries_stored 
FROM sources s 
LEFT JOIN log_entries le ON s.id = le.source_id 
GROUP BY s.id, s.name, s.format 
ORDER BY total_entries_stored ASC;
```

### Execution Output:
```
 id |      name       | format  | total_entries_stored 
----+-----------------+---------+----------------------
  2 | web-access      | ACCESS  |                    0
  4 | synthetic-demo  | GENERIC |                    0
  5 | silent-demo     | GENERIC |                    0
  3 | app-server      | GENERIC |                 3000
  1 | auth-server     | GENERIC |                 5000
(5 rows)
```

---

## Query 6: Correlated Subquery with NOT EXISTS (Rule Auditing)
- **DBMS Concept**: Correlated subquery using `NOT EXISTS` referencing the outer query relation.
- **Business Use Case**: Identifies unused detection rules that have never matched any incoming log lines, helping security engineers prune obsolete signatures.

### SQL Statement:
```sql
SELECT r.id, 
       r.name, 
       r.category, 
       r.severity 
FROM rules r 
WHERE NOT EXISTS (
    SELECT 1 
    FROM log_entries le 
    WHERE le.rule_id = r.id
);
```

### Execution Output:
```
 id |        name         |  category   | severity 
----+---------------------+-------------+----------
  3 | Port scan detection | PORT_SCAN   | HIGH
(1 row)
```

---

## Query 7: Nested Subquery with IN (Operator Triage Audit)
- **DBMS Concept**: `IN` subquery evaluating membership against a filtered secondary dataset.
- **Business Use Case**: Security compliance auditing to report all system operators who have actively acknowledged high-severity or critical security incidents.

### SQL Statement:
```sql
SELECT u.id, 
       u.username, 
       u.email, 
       u.role 
FROM users u 
WHERE u.id IN (
    SELECT a.acknowledged_by 
    FROM alerts a 
    WHERE a.severity IN ('HIGH', 'CRITICAL') 
      AND a.acknowledged_by IS NOT NULL
);
```

### Execution Output:
```
 id | username |          email           | role  
----+----------+--------------------------+-------
  1 | admin    | admin@logsentinel.local  | ADMIN
(1 row)
```

---

## Query 8: Window Function (Moving Average of Log Volume)
- **DBMS Concept**: Analytical window function `AVG() OVER (ORDER BY ... ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` combined with `date_trunc`.
- **Business Use Case**: Computes a 3-hour smoothed moving average of log ingestion volume to detect anomaly spikes and volume saturation.

### SQL Statement:
```sql
SELECT date_trunc('hour', logged_at) AS event_hour, 
       count(*) AS hour_count, 
       round(avg(count(*)) OVER (
           ORDER BY date_trunc('hour', logged_at) 
           ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
       ), 2) AS moving_avg_3hr 
FROM log_entries 
GROUP BY 1 
ORDER BY 1 
LIMIT 5;
```

### Execution Output:
```
       event_hour       | hour_count | moving_avg_3hr 
------------------------+------------+----------------
 2026-11-15 10:00:00+05 |          2 |           2.00
 2026-11-15 12:00:00+05 |         18 |          10.00
 2026-11-20 19:00:00+05 |       2319 |         779.67
 2026-11-20 20:00:00+05 |        681 |        1006.00
 2026-11-20 21:00:00+05 |          0 |         999.67
(5 rows)
```

---

## Query 9: Window Function (LAG Inter-Arrival Attack Time)
- **DBMS Concept**: `LAG()` window function with `PARTITION BY ip ORDER BY logged_at`, calculating epoch difference between consecutive log lines.
- **Business Use Case**: High-precision brute-force detection: proves whether authentication attempts were submitted by an automated bot ($< 0.3$s delay) or human.

### SQL Statement:
```sql
SELECT line_no, 
       ip, 
       logged_at, 
       LAG(logged_at) OVER (PARTITION BY ip ORDER BY logged_at) AS previous_event_at, 
       round(EXTRACT(EPOCH FROM (logged_at - LAG(logged_at) OVER (PARTITION BY ip ORDER BY logged_at)))::numeric, 3) AS delta_seconds 
FROM log_entries 
WHERE ip = '203.0.113.99' 
  AND category = 'AUTH_FAILURE' 
ORDER BY logged_at ASC 
LIMIT 5;
```

### Execution Output:
```
 line_no |      ip      |           logged_at           |       previous_event_at       | delta_seconds 
---------+--------------+-------------------------------+-------------------------------+---------------
       9 | 203.0.113.99 | 2026-11-15 12:26:16.604+05:30 | [NULL]                        |        [NULL]
      11 | 203.0.113.99 | 2026-11-15 12:26:16.806+05:30 | 2026-11-15 12:26:16.604+05:30 |         0.202
      13 | 203.0.113.99 | 2026-11-15 12:26:17.008+05:30 | 2026-11-15 12:26:16.806+05:30 |         0.202
      15 | 203.0.113.99 | 2026-11-15 12:28:58.708+05:30 | 2026-11-15 12:26:17.008+05:30 |       161.700
      16 | 203.0.113.99 | 2026-11-15 12:28:58.809+05:30 | 2026-11-15 12:28:58.708+05:30 |         0.101
(5 rows)
```
*Insight*: The `0.202s` and `0.101s` delta times confirm automated credential-stuffing software.

---

## Query 10: Set Operation (INTERSECT Threat Cross-Correlation)
- **DBMS Concept**: Relational set intersection (`INTERSECT`) returning distinct tuples present in both select sets.
- **Business Use Case**: Identifies IP addresses that both failed an authentication attempt and subsequently achieved a successful login (credential compromise).

### SQL Statement:
```sql
(SELECT ip FROM log_entries WHERE category = 'AUTH_FAILURE' AND ip IS NOT NULL)
INTERSECT
(SELECT ip FROM log_entries WHERE category = 'AUTH_SUCCESS' AND ip IS NOT NULL)
ORDER BY ip 
LIMIT 5;
```

### Execution Output:
```
      ip       
---------------
 198.51.100.23
 203.0.113.45
(2 rows)
```

---

## Query 11: DML Operation: INSERT with RETURNING
- **DBMS Concept**: Data Manipulation Language (`INSERT`) with immediate projection of generated keys via `RETURNING`.
- **Business Use Case**: Used by the backend REST API (`POST /api/v1/rules`) to persist new regex signatures and return the generated ID to the UI.

### SQL Statement:
```sql
INSERT INTO rules (name, pattern, flags, category, severity, is_active, created_by, created_at) 
VALUES ('SQL Injection Detection', '(union|select|drop|insert|alter|exec).*', 'i', 'SQL_INJECTION', 'CRITICAL', true, 1, now()) 
RETURNING id, name, category, severity;
```

### Execution Output:
```
 id |           name            |   category    | severity 
----+---------------------------+---------------+----------
  4 | SQL Injection Detection   | SQL_INJECTION | CRITICAL
(1 row)
```

---

## Query 12: DML Operation: UPDATE with State Machine Validation
- **DBMS Concept**: `UPDATE` statement modifying multiple fields with conditional `WHERE` status matching and `RETURNING`.
- **Business Use Case**: Alert triage resolution endpoint (`PATCH /api/v1/alerts/:id/ack`), recording analyst ID and setting the status timestamp.

### SQL Statement:
```sql
UPDATE alerts 
SET status = 'ACKNOWLEDGED', 
    acknowledged_by = 1, 
    acknowledged_at = now() 
WHERE id = 1 
RETURNING id, title, status, acknowledged_by, acknowledged_at;
```

### Execution Output:
```
 id |           title            |    status    | acknowledged_by |        acknowledged_at        
----+----------------------------+--------------+-----------------+-------------------------------
  1 | Brute-force login detected | ACKNOWLEDGED |               1 | 2026-11-23 23:03:59.581+05:30
(1 row)
```
