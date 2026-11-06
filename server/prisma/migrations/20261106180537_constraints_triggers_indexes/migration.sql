-- This is an empty migration.
-- Domain / CHECK constraints
ALTER TABLE users          ADD CONSTRAINT chk_users_email     CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
ALTER TABLE rules          ADD CONSTRAINT chk_rules_category  CHECK (category ~ '^[A-Z_]+$');
ALTER TABLE rules          ADD CONSTRAINT chk_rules_flags     CHECK (flags ~ '^[gimsuy]*$');
ALTER TABLE alert_policies ADD CONSTRAINT chk_policy_threshold CHECK (threshold_count > 0);
ALTER TABLE alert_policies ADD CONSTRAINT chk_policy_window    CHECK (window_seconds BETWEEN 1 AND 86400);
ALTER TABLE import_batches ADD CONSTRAINT chk_batch_counts     CHECK (lines_total >= 0 AND lines_ok >= 0 AND lines_failed >= 0);
ALTER TABLE log_entries    ADD CONSTRAINT chk_log_entries_line_no CHECK (line_no > 0);
ALTER TABLE alerts         ADD CONSTRAINT chk_alert_window     CHECK (window_end >= window_start);
ALTER TABLE alerts         ADD CONSTRAINT chk_alert_ack        CHECK (status = 'OPEN' OR acknowledged_at IS NOT NULL);

-- Trigram index
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_log_entries_message_trgm ON log_entries USING gin (message gin_trgm_ops);

-- Real-time notification
CREATE OR REPLACE FUNCTION notify_new_alert() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('new_alert',
    json_build_object('id', NEW.id, 'severity', NEW.severity, 'title', NEW.title)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_alert
AFTER INSERT ON alerts
FOR EACH ROW EXECUTE FUNCTION notify_new_alert();
