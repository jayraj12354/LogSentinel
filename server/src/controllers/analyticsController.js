'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config/env');

// Analytics only reads, so it connects as the read-only logsentinel_viewer role (db/roles.sql).
const pool = new Pool({ connectionString: config.analyticsDatabaseUrl });

const QUERIES = {
  top_offenders: "SELECT ip, count(*) AS failures FROM log_entries WHERE category='AUTH_FAILURE' AND ip IS NOT NULL GROUP BY ip ORDER BY failures DESC LIMIT 10",
  moving_average_errors: "SELECT date_trunc('hour', logged_at) AS hour, count(*) FILTER (WHERE level='ERROR') AS errors FROM log_entries GROUP BY 1 ORDER BY 1",
  fail_then_success: "SELECT f.ip, f.logged_at AS failed_at, s.logged_at AS success_at FROM log_entries f JOIN log_entries s ON f.ip=s.ip AND s.category='AUTH_SUCCESS' AND s.logged_at>f.logged_at AND s.logged_at<=f.logged_at+interval '10 minutes' WHERE f.category='AUTH_FAILURE' ORDER BY f.logged_at LIMIT 20",
  events_per_hour: "SELECT date_trunc('hour', logged_at) AS hour, count(*)::int AS total, (count(*) FILTER (WHERE category='AUTH_FAILURE'))::int AS failures, (count(*) FILTER (WHERE level IN ('ERROR','CRITICAL')))::int AS errors FROM log_entries GROUP BY 1 ORDER BY 1",
};
const QUERIES_DIR = path.resolve(__dirname, '../../../db/queries');

async function summary(_req, res) {
  const [r1, r2, r3, r4] = await Promise.all([
    pool.query('SELECT count(*) AS total_entries FROM log_entries'),
    pool.query("SELECT count(*) AS open_alerts FROM alerts WHERE status = 'OPEN'"),
    pool.query("SELECT category, count(*) AS cnt FROM log_entries WHERE category IS NOT NULL GROUP BY category ORDER BY cnt DESC LIMIT 5"),
    pool.query("SELECT severity, count(*) AS cnt FROM alerts GROUP BY severity ORDER BY severity"),
  ]);
  res.json({
    data: {
      totalEntries: Number(r1.rows[0].total_entries),
      openAlerts: Number(r2.rows[0].open_alerts),
      topCategories: r3.rows.map((r) => ({ category: r.category, count: Number(r.cnt) })),
      bySeverity: r4.rows.map((r) => ({ severity: r.severity, count: Number(r.cnt) })),
    },
  });
}

async function runCatalogued(req, res) {
  const sql = Object.hasOwn(QUERIES, req.params.name) && QUERIES[req.params.name];
  if (!sql) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'unknown analytics query' } });
  const { rows } = await pool.query(sql);
  res.json({ data: rows });
}

// Only catalogued names: the name comes from the URL, and Express decodes %2F, so a raw name could walk out of db/queries.
async function getSql(req, res) {
  const { name } = req.params;
  const file = Object.hasOwn(QUERIES, name) && fs.readdirSync(QUERIES_DIR).find((f) => f.endsWith(`${name}.sql`));
  if (!file) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'sql not found' } });
  res.type('text/sql').send(fs.readFileSync(path.join(QUERIES_DIR, file), 'utf8'));
}

module.exports = { summary, runCatalogued, getSql };
