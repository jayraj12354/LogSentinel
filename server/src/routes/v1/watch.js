'use strict';

const express = require('express');
const { auth, adminOnly } = require('../../middleware/auth');
const catchErrors = require('../../middleware/catchErrors');
const { PrismaClient } = require('@prisma/client');
const { WatchManager } = require('../../services/watchManager');
const { parseLine } = require('../../services/logParser');
const { compileRules, classify } = require('../../services/classifier');
const { pool } = require('../../config/db');

const prisma = new PrismaClient();
const watchManager = new WatchManager();

// Cache compiled rules per source watch session; refresh on each start
let compiledRules = [];

async function refreshCompiledRules() {
  const rules = await prisma.rule.findMany({ where: { isActive: true } });
  compiledRules = compileRules(rules);
}

async function handleLogLine(sourceId, lineNo, text) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) return;
  const parsed = parseLine(text, source.format);
  if (!parsed) return;
  const classification = classify(parsed.message, compiledRules);
  await pool.query(
    `INSERT INTO log_entries (source_id, line_no, logged_at, level, message, ip, category, rule_id, raw, batch_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)`,
    [sourceId, lineNo, parsed.loggedAt, parsed.level, parsed.message, parsed.ip, classification.category, classification.ruleId, JSON.stringify(parsed.raw)]
  );
}

const r = express.Router();
r.post('/:id/watch', auth, adminOnly, catchErrors(async (req, res) => {
  const id = Number(req.params.id);
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source || !source.filePath) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'source has no file path' } });
  if (watchManager.status(id).watching) return res.status(409).json({ error: { code: 'CONFLICT', message: 'already watching' } });
  await refreshCompiledRules();
  await watchManager.start(id, source.filePath, (sid, lineNo, text) => {
    handleLogLine(sid, lineNo, text).catch(() => {});
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
