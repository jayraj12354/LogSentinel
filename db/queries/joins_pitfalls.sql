-- Joins pitfalls: inner join drops orphaned entries vs left join keeps them
-- Inner join: only entries with a source
SELECT le.id, le.message, s.name AS source_name
FROM log_entries le
INNER JOIN sources s ON s.id = le.source_id
LIMIT 5;

-- Left join: entries without a source show null source_name
SELECT le.id, le.message, s.name AS source_name
FROM log_entries le
LEFT JOIN sources s ON s.id = le.source_id
WHERE s.id IS NULL
LIMIT 5;
