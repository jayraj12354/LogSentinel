-- Alert triage window: count events per IP within sliding window (window function)
SELECT ip, category, logged_at,
       count(*) OVER (PARTITION BY ip, category ORDER BY logged_at RANGE BETWEEN interval '5 minutes' PRECEDING AND CURRENT ROW) AS events_in_window
FROM log_entries
WHERE category IN ('AUTH_FAILURE', 'PORT_SCAN', 'SQL_INJECTION')
ORDER BY ip, logged_at;
