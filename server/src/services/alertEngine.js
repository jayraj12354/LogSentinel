'use strict';

const { pool } = require('../config/db');

async function evaluatePolicies() {
  const policies = await pool.query('SELECT * FROM alert_policies WHERE is_active = true');
  const now = new Date();
  for (const p of policies.rows) {
    const start = new Date(now.getTime() - p.window_seconds * 1000);
    const groupCol = p.group_by === 'SOURCE' ? 'source_id' : 'ip';
    const sql = `SELECT ${groupCol} AS g, count(*) AS cnt FROM log_entries WHERE category = $1 AND logged_at >= $2 AND $3 IS NOT NULL GROUP BY ${groupCol} HAVING count(*) >= $4`;
    const params = [p.category, start, p.group_by === 'SOURCE' ? null : null, p.threshold_count];
    const rows = await pool.query(sql, params);
    for (const row of rows.rows) {
      const dedupeKey = `${p.id}:${row.g}`;
      const existing = await pool.query('SELECT id FROM alerts WHERE dedupe_key = $1 AND status = $2', [dedupeKey, 'OPEN']);
      if (existing.rows.length > 0) continue;
      await pool.query(
        `INSERT INTO alerts (policy_id, source_id, title, severity, event_count, ip, dedupe_key, status, window_start, window_end, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', $8, $9, $10)`,
        [p.id, p.group_by === 'SOURCE' ? row.g : null, `${p.name} detected`, p.severity, row.cnt, p.group_by === 'IP' ? row.g : null, dedupeKey, start, now, JSON.stringify({ group: row.g, count: row.cnt })]
      );
    }
  }
}

module.exports = { evaluatePolicies };
