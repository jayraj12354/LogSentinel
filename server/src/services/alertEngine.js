'use strict';

const { pool } = require('../config/db');

let timer = null;
let running = false;

async function evaluatePolicies() {
  if (running) return;
  running = true;
  try {
    const policies = await pool.query('SELECT * FROM alert_policies WHERE is_active = true');
    const now = new Date();
    for (const p of policies.rows) {
      const start = new Date(now.getTime() - p.window_seconds * 1000);
      const groupCol = p.group_by === 'SOURCE' ? 'source_id' : 'ip';
      const sql = `SELECT ${groupCol} AS g, count(*) AS cnt FROM log_entries WHERE category = $1 AND logged_at >= $2 GROUP BY ${groupCol} HAVING count(*) >= $3`;
      const rows = await pool.query(sql, [p.category, start, p.threshold_count]);
      for (const row of rows.rows) {
        const dedupeKey = `${p.id}:${row.g}`;
        // Skip if this group already has an unresolved alert, or one resolved inside the current window
        // (resolving frees the key by suffixing '#<id>'; see alertsController.resolve).
        const existing = await pool.query(
          "SELECT id FROM alerts WHERE (dedupe_key = $1 AND status <> 'RESOLVED') OR (dedupe_key LIKE $1 || '#%' AND acknowledged_at >= $2) LIMIT 1",
          [dedupeKey, start],
        );
        if (existing.rows.length > 0) continue;
        await pool.query(
          `INSERT INTO alerts (policy_id, source_id, title, severity, event_count, ip, dedupe_key, status, window_start, window_end, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', $8, $9, $10) ON CONFLICT DO NOTHING`,
          [p.id, p.group_by === 'SOURCE' ? row.g : null, `${p.name} detected`, p.severity, row.cnt, p.group_by === 'IP' ? row.g : null, dedupeKey, start, now, JSON.stringify({ group: row.g, count: row.cnt })]
        );
      }
    }
  } catch (e) {
    console.error('[alertEngine] evaluation error:', e.message);
  } finally {
    running = false;
  }
}

function start(intervalMs) {
  if (timer) return;
  evaluatePolicies();
  timer = setInterval(() => evaluatePolicies(), intervalMs);
  console.log(`[alertEngine] started (interval ${intervalMs}ms)`);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { start, stop, evaluatePolicies };
