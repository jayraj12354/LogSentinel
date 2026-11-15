'use strict';

const { pool } = require('../config/db');

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

async function fileVsSql(req, res) {
  const start = Date.now();
  await pool.query('SELECT count(*) FROM log_entries');
  const dbMs = Date.now() - start;
  res.json({ data: { sourceId: req.query.sourceId, ip: req.query.ip, fileMs: 0, dbMs, note: 'file path comparison placeholder' } });
}

async function runCatalogued(req, res) {
  const { name } = req.params;
  const allowed = ['top_offenders', 'moving_average_errors', 'fail_then_success', 'events_per_hour'];
  if (!allowed.includes(name)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'unknown analytics query' } });
  let sql;
  if (name === 'top_offenders') sql = "SELECT ip, count(*) AS failures FROM log_entries WHERE category='AUTH_FAILURE' AND ip IS NOT NULL GROUP BY ip ORDER BY failures DESC LIMIT 10";
  if (name === 'moving_average_errors') sql = "SELECT date_trunc('hour', logged_at) AS hour, count(*) FILTER (WHERE level='ERROR') AS errors FROM log_entries GROUP BY 1 ORDER BY 1";
  if (name === 'fail_then_success') sql = "SELECT f.ip, f.logged_at AS failed_at, s.logged_at AS success_at FROM log_entries f JOIN log_entries s ON f.ip=s.ip AND s.category='AUTH_SUCCESS' AND s.logged_at>f.logged_at AND s.logged_at<=f.logged_at+interval '10 minutes' WHERE f.category='AUTH_FAILURE' ORDER BY f.logged_at LIMIT 20";
  if (name === 'events_per_hour') sql = "SELECT date_trunc('hour', logged_at) AS hour, count(*)::int AS total, (count(*) FILTER (WHERE category='AUTH_FAILURE'))::int AS failures, (count(*) FILTER (WHERE level IN ('ERROR','CRITICAL')))::int AS errors FROM log_entries GROUP BY 1 ORDER BY 1";
  const { rows } = await pool.query(sql);
  res.json({ data: rows });
}

async function getSql(req, res) {
  const { name } = req.params;
  const fs = require('fs');
  const path = require('path');
  const queriesDir = path.resolve(__dirname, '../../../db/queries');
  let file = path.join(queriesDir, `${name}.sql`);
  if (!fs.existsSync(file)) {
    // Fallback: find a catalogued file whose basename contains the name
    const match = fs.readdirSync(queriesDir).find((f) => f.includes(name) && f.endsWith('.sql'));
    if (!match) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'sql not found' } });
    file = path.join(queriesDir, match);
  }
  res.type('text/sql').send(fs.readFileSync(file, 'utf8'));
}

module.exports = { summary, fileVsSql, runCatalogued, getSql };
