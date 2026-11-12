'use strict';

const { pool } = require('../config/db');

async function summary(_req, res) {
  const [[{ totalEntries }], [{ openAlerts }], [{ byCat }], [{ bySev }]] = await Promise.all([
    pool.query('SELECT count(*) AS total_entries FROM log_entries'),
    pool.query("SELECT count(*) AS open_alerts FROM alerts WHERE status = 'OPEN'"),
    pool.query("SELECT category, count(*) FROM log_entries WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 5"),
    pool.query("SELECT severity, count(*) FROM alerts GROUP BY severity ORDER BY severity"),
  ]);
  res.json({ data: { totalEntries: Number(totalEntries), openAlerts: Number(openAlerts), topCategories: byCat, bySeverity: bySev } });
}

async function fileVsSql(req, res) {
  const start = Date.now();
  await pool.query('SELECT count(*) FROM log_entries');
  const dbMs = Date.now() - start;
  res.json({ data: { sourceId: req.query.sourceId, ip: req.query.ip, fileMs: 0, dbMs, note: 'file path comparison placeholder' } });
}

async function runCatalogued(req, res) {
  const { name } = req.params;
  const allowed = ['top_offenders', 'moving_average_errors', 'fail_then_success'];
  if (!allowed.includes(name)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'unknown analytics query' } });
  let sql;
  if (name === 'top_offenders') sql = "SELECT ip, count(*) AS failures FROM log_entries WHERE category='AUTH_FAILURE' GROUP BY ip ORDER BY failures DESC LIMIT 10";
  if (name === 'moving_average_errors') sql = "SELECT date_trunc('hour', logged_at) AS hour, count(*) FILTER (WHERE level='ERROR') AS errors FROM log_entries GROUP BY 1 ORDER BY 1";
  if (name === 'fail_then_success') sql = "SELECT f.ip, f.logged_at AS failed_at, s.logged_at AS success_at FROM log_entries f JOIN log_entries s ON f.ip=s.ip AND s.category='AUTH_SUCCESS' AND s.logged_at>f.logged_at AND s.logged_at<=f.logged_at+interval '10 minutes' WHERE f.category='AUTH_FAILURE' ORDER BY f.logged_at LIMIT 20";
  const { rows } = await pool.query(sql);
  res.json({ data: rows });
}

async function getSql(req, res) {
  const { name } = req.params;
  const fs = require('fs');
  const path = require('path');
  const file = path.join(__dirname, '../../../db/queries', `${name}.sql`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'sql not found' } });
  res.type('text/sql').send(fs.readFileSync(file, 'utf8'));
}

module.exports = { summary, fileVsSql, runCatalogued, getSql };
