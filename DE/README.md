# LogSentinel — Database Engineering (DE) Portfolio
**Course**: Integrated Project / Database Management Systems (DBMS)  
**System**: LogSentinel — Desktop Real-time Log Monitoring & Alerting System  
**Selected Database**: PostgreSQL (Relational DBMS)  
**Project Repository Path**: `DE/`

---

## 📌 Executive Summary

**LogSentinel** is a full-stack, security-centric log monitoring, threat detection, and alert triage desktop application. Central to the application is a robust, highly normalized relational database engine built on **PostgreSQL**. The database is responsible for ingesting, parsing, classifying, persisting, and triaging high-volume application and security logs while streaming real-time alerts to the desktop client.

This **DE Portfolio** fulfills all academic and functional expectations outlined in the DBMS Integrated Project specification. It documents the architectural rationale, relational data modeling, mathematical normalization transformations (UNF → 1NF → 2NF → 3NF), production DDL implementations, project-specific analytical queries, and seamless backend integration.

---

## 📂 Deliverables Directory

The `DE/` directory is modularized into dedicated, comprehensive technical reports:

| Deliverable File | Description | Core Topics Covered |
|---|---|---|
| [**`01_Database_Selection_and_Justification.md`**](01_Database_Selection_and_Justification.md) | Database selection analysis | PostgreSQL vs. MongoDB comparison, ACID compliance, time-series querying, window functions, pub/sub triggers. |
| [**`02_ER_Diagram_and_Data_Modelling.md`**](02_ER_Diagram_and_Data_Modelling.md) | Relational modeling & ERD | Entities, attributes, composite PKs, foreign keys, weak entities (`log_entries`), cardinalities, Mermaid ER diagram. |
| [**`03_Database_Normalization.md`**](03_Database_Normalization.md) | Formal normalization proofs | UNF anomalies, Functional Dependencies (FDs), step-by-step conversion to 1NF, 2NF, and 3NF, BCNF analysis. |
| [**`04_Final_Database_Schema.md`**](04_Final_Database_Schema.md) | Production DDL & specifications | Complete DDL statements, domain `CHECK` constraints, composite keys, indexes (B-Tree, GIN trigram), PL/pgSQL triggers. |
| [**`05_Sample_Records.md`**](05_Sample_Records.md) | Live sample datasets | Realistic, production-like sample data across all 7 tables demonstrating referential integrity and live system state. |
| [**`06_Queries_and_Execution.md`**](06_Queries_and_Execution.md) | 13 Project-specific queries | DML (INSERT, UPDATE, DELETE), filtered/sorted SELECT, Aggregates, GROUP BY & HAVING, JOINs, Subqueries, Window functions (`LAG`, Moving Avg), Set operations (`INTERSECT`), with live execution outputs. |
| [**`07_Database_Backend_Integration.md`**](07_Database_Backend_Integration.md) | Backend integration evidence | Dual connection pools (`logsentinel_app` vs `logsentinel_viewer`), Prisma ORM mapping, transactional batch imports, `pg_notify` pub/sub for SSE streaming. |
| [**`08_Architecture_and_Design_Decisions.md`**](08_Architecture_and_Design_Decisions.md) | Architecture & performance | Least privilege DCL, connection pooling, declarative range partitioning for high volume, concurrency control, data integrity. |

---

## 🏛️ High-Level System & Database Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 LogSentinel Desktop                                    │
│  ┌──────────────────────────────┐              ┌────────────────────────────────────┐  │
│  │   React 18 + Vite Frontend   │◄──(SSE/REST)─│      Node.js / Express Backend     │  │
│  │    (Dashboard & Triage)      │              │       (Prisma ORM + pg.Pool)       │  │
│  └──────────────────────────────┘              └──────────────────┬─────────────────┘  │
└───────────────────────────────────────────────────────────────────┼────────────────────┘
                                                                    │
                                    ┌───────────────────────────────┴────────────────────┐
                                    │                PostgreSQL 16 Engine                │
                                    │  ┌──────────────────────────────────────────────┐  │
                                    │  │ Connection Pool 1: logsentinel_app (Read/Write)│
                                    │  │  - User Auth, Log Batch Ingestion, Rules     │  │
                                    │  │  - PL/pgSQL Trigger: trg_notify_new_alert    │  │
                                    │  ├──────────────────────────────────────────────┤  │
                                    │  │ Connection Pool 2: logsentinel_viewer (RO)   │  │
                                    │  │  - Window Functions, Aggregations, Analytics │  │
                                    │  │  - Column-level Security (No Password Hash)  │  │
                                    │  └──────────────────────────────────────────────┘  │
                                    └────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Verification Guide

To inspect the live PostgreSQL database and execute the query suite:
```bash
# 1. Connect via psql using the application role
PGPASSWORD=app_pass psql -h localhost -p 5432 -U logsentinel_app -d logsentinel

# 2. View tables and relations
\dt
\d+ log_entries
\d+ alerts

# 3. Check trigger and notification listeners
SELECT tgname, tgrelid::regclass, proname 
FROM pg_trigger t 
JOIN pg_proc p ON t.tgfoid = p.oid 
WHERE tgname = 'trg_notify_new_alert';
```
