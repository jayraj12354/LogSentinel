-- Moving average of errors per hour (window frame)
SELECT date_trunc('hour', logged_at) AS hour,
       count(*) FILTER (WHERE level = 'ERROR') AS errors,
       round(avg(count(*) FILTER (WHERE level = 'ERROR')) OVER (ORDER BY date_trunc('hour', logged_at) ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg
FROM log_entries
GROUP BY 1
ORDER BY 1;
