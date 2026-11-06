DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'logsentinel_viewer') THEN
    CREATE ROLE logsentinel_viewer LOGIN PASSWORD 'viewer_pass';
  END IF;
END $$;

GRANT CONNECT ON DATABASE logsentinel TO logsentinel_viewer;
GRANT USAGE   ON SCHEMA public        TO logsentinel_viewer;
GRANT SELECT  ON ALL TABLES IN SCHEMA public TO logsentinel_viewer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO logsentinel_viewer;

REVOKE SELECT ON users FROM logsentinel_viewer;
GRANT  SELECT (id, username, email, role, created_at) ON users TO logsentinel_viewer;
