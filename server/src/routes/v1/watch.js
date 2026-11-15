'use strict';

const express = require('express');
const { auth, adminOnly } = require('../../middleware/auth');
const catchErrors = require('../../middleware/catchErrors');
const fs = require('fs');
const { WatchManager } = require('../../services/watchManager');
const { resolveLogPath } = require('../../services/importService');
const { parseLine } = require('../../services/logParser');
const { compileRules, classify } = require('../../services/classifier');
const { pool, prisma } = require('../../config/db');
const logger = require('../../utils/logger');

const watchManager = new WatchManager();

const r = express.Router();
r.post('/:id/watch', auth, adminOnly, catchErrors(async (req, res) => {
  const id = Number(req.params.id);
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source || !source.filePath) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'source has no file path' } });
  if (watchManager.status(id).watching) return res.status(409).json({ error: { code: 'CONFLICT', message: 'already watching' } });
  const file = resolveLogPath(source.filePath);
  if (!fs.existsSync(file)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `log file not found: ${file}` } });
  // shortcut: rules are compiled once per watch; restart the watch after editing rules.
  const rules = compileRules(await prisma.rule.findMany({ where: { isActive: true } }));
  watchManager.start(id, file, (sourceId, lineNo, text) => {
    const p = parseLine(text, source.format);
    if (!p) return;
    const c = classify(p.message, rules);
    pool.query(
      'INSERT INTO log_entries (source_id, line_no, logged_at, level, message, ip, category, rule_id, raw) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',
      [sourceId, lineNo, p.loggedAt, p.level, p.message, p.ip, c.category, c.ruleId, JSON.stringify(p.raw)],
    ).catch((e) => logger.warn(`[watch] insert failed for source ${sourceId} line ${lineNo}: ${e.message}`));
  });
  res.json({ data: { watching: true } });
}));
r.delete('/:id/watch', auth, adminOnly, catchErrors((req, res) => {
  const id = Number(req.params.id);
  watchManager.stop(id);
  res.json({ data: { watching: watchManager.status(id).watching } });
}));
r.get('/:id/watch', auth, catchErrors((req, res) => {
  const id = Number(req.params.id);
  res.json({ data: watchManager.status(id) });
}));
module.exports = r;
