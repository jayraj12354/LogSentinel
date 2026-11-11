-- DDL showcase: CREATE / ALTER / TRUNCATE / DROP
CREATE TABLE ddl_demo (id serial primary key, label text, note text, created_at timestamptz default now());
ALTER TABLE ddl_demo ADD COLUMN remark text;
ALTER TABLE ddl_demo RENAME COLUMN remark TO memo;
TRUNCATE ddl_demo;
DROP TABLE ddl_demo;
