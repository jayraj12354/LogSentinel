-- Top offenders: IPs with most AUTH_FAILURE events
SELECT ip, count(*) AS failures
FROM log_entries
WHERE category = 'AUTH_FAILURE'
GROUP BY ip
ORDER BY failures DESC
LIMIT 10;
