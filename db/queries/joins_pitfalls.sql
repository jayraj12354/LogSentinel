-- Joins pitfalls: missing source due to inner join vs left join
-- INNER JOIN drops log_entries whose source was deleted
SELECT le.id, le.message, s.name AS source_name
FROM log_entries le
INNER JOIN sources s ON s.id = le.source_id
LIMIT 5;

-- LEFT JOIN keeps orphaned entries (source may be null)
SELECT le.id, le.message, s.name AS source_name
FROM log_entries le
LEFT JOIN sources s ON s.id = le.source_id
WHERE s.id IS NULL
LIMIT 5;
