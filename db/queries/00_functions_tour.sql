-- Functions tour: lower, upper, length, coalesce, date parts, cast
SELECT lower(message) AS l, upper(message) AS u, length(message) AS len,
       coalesce(category, 'uncategorized') AS cat,
       extract(hour FROM logged_at) AS hr,
       logged_at::date AS logged_date
FROM log_entries
LIMIT 10;
