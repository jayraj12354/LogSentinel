'use strict';

const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const catchErrors = require('../middleware/catchErrors');
const { PrismaClient } = require('@prisma/client');
const { WatchManager } = require('../services/watchManager');

const prisma = new PrismaClient();
const watchManager = new WatchManager();

const r = express.Router();
r.post('/:id/watch', auth, adminOnly, catchErrors(async (req, res) => {
  const id = Number(req.params.id);
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source || !source.filePath) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'source has no file path' } });
  if (watchManager.status(id).watching) return res.status(409).json({ error: { code: 'CONFLICT', message: 'already watching' } });
  watchManager.start(id, source.filePath, () => {});
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
