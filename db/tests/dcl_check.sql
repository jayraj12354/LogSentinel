-- DCL check: read-only role cannot modify data
SELECT current_user;
SELECT count(*) FROM log_entries;
UPDATE log_entries SET message = 'tampered' WHERE line_no = 1;
INSERT INTO sources (name, file_path) VALUES ('x', '/tmp/x.log');
