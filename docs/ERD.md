# LogSentinel — Entity Relationship Diagram

## Tables

| Table | PK | Description |
|-------|----|-------------|
| `users` | `id` | Application users (ADMIN / VIEWER roles) |
| `sources` | `id` | Log sources (file path + format) |
| `rules` | `id` | Classification regex rules (created_by → users) |
| `alert_policies` | `id` | Alert threshold policies |
| `import_batches` | `id` | Bulk import jobs (source_id → sources) |
| `log_entries` | (`source_id`, `line_no`) | Weak entity — parsed log lines |
| `alerts` | `id` | Raised alerts (policy_id, source_id, acknowledged_by → users) |

## Relationships

- **users 1:N rules** — a user creates rules; on user delete, rule.createdBy → SetNull
- **users :N alerts (acknowledger)** — a user acknowledges alerts; on delete → SetNull
- **sources 1:N log_entries (identifying)** — log_entries has no identity without source (composite PK)
- **sources 1:N import_batches** — cascade on delete
- **sources 1:N alerts** — on delete → SetNull
- **import_batches 1:N log_entries** — on delete → SetNull
- **rules 1:N log_entries** — on delete → SetNull
- **alert_policies 1:N alerts** — cascade on delete

## Indexes

- `idx_log_entries_logged_at` — on log_entries(logged_at)
- `idx_log_entries_category_time` — on log_entries(category, logged_at)
- `idx_log_entries_ip` — on log_entries(ip)
- `idx_log_entries_message_trgm` — GIN trigram index on message (pg_trgm)
- `idx_alerts_status_time` — on alerts(status, triggeredAt)
- `alerts unique (policyId, dedupeKey)` — prevents duplicate alert re-raise

## Constraints

- `chk_users_email` — email format CHECK
- `chk_rules_category` — UPPER_UNDERSCORE format CHECK
- `chk_rules_flags` — regex flags CHECK
- `chk_policy_threshold` — threshold_count > 0
- `chk_policy_window` — window_seconds BETWEEN 1 AND 86400
- `chk_batch_counts` — counts >= 0
- `chk_log_entries_line_no` — line_no > 0
- `chk_alert_window` — window_end >= window_start
- `chk_alert_ack` — non-OPEN status requires acknowledged_at

## Triggers

- `trg_notify_new_alert` — AFTER INSERT on alerts, calls `notify_new_alert()` which `pg_notify('new_alert', ...)` for real-time SSE push.
