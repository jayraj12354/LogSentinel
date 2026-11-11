-- generate_series demo rows for the synthetic-demo source (Part 5)
INSERT INTO log_entries (source_id, line_no, logged_at, level, message, category, raw)
SELECT s.id, g,
       now() - (random() * interval '48 hours'),
       'INFO'::loglevel,
       'synthetic demo row ' || g,
       NULL,
       '{}'::jsonb
FROM generate_series(1, 50) AS g
CROSS JOIN (SELECT id FROM sources WHERE name = 'synthetic-demo') AS s;
