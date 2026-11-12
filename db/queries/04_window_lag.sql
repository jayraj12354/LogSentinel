-- Window functions: LAG to detect fail-then-success sequences per IP
SELECT f.ip, f.logged_at AS failed_at, s.logged_at AS success_at,
       LAG(f.logged_at) OVER (PARTITION BY f.ip ORDER BY f.logged_at) AS prev_fail_at
FROM log_entries f
JOIN log_entries s
  ON f.ip = s.ip
 AND s.category = 'AUTH_SUCCESS'
 AND s.logged_at > f.logged_at
 AND s.logged_at <= f.logged_at + interval '10 minutes'
WHERE f.category = 'AUTH_FAILURE'
ORDER BY f.logged_at
LIMIT 20;
