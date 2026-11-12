-- Set operations: IPs that are both AUTH_FAILURE and PORT_SCAN (INTERSECT)
(SELECT ip FROM log_entries WHERE category = 'AUTH_FAILURE')
INTERSECT
(SELECT ip FROM log_entries WHERE category = 'PORT_SCAN')
ORDER BY ip;
