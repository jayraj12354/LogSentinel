-- Silent source: sources that never received logs (left join / NOT EXISTS)
SELECT s.id, s.name
FROM sources s
WHERE NOT EXISTS (SELECT 1 FROM log_entries le WHERE le.source_id = s.id)
ORDER BY s.name;
