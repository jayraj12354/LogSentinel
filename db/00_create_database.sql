CREATE ROLE logsentinel_app LOGIN PASSWORD 'app_pass' CREATEDB;
CREATE DATABASE logsentinel OWNER logsentinel_app;
