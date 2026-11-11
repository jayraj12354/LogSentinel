'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];

function parseLevels(v) {
  if (!v) return null;
  const parts = String(v).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  return parts.every((p) => LEVELS.includes(p)) ? parts : null;
}

exports.list = async (req, res) => {
  const { sourceId, level, category, ip, q, from, to, page = 1, pageSize = 25 } = req.query;
  const where = {};
  if (sourceId) where.sourceId = Number(sourceId);
  if (level) where.level = { in: parseLevels(level) };
  if (category) where.category = category;
  if (ip) where.ip = ip;
  if (q) where.message = { contains: q, mode: 'insensitive' };
  if (from || to) {
    where.loggedAt = {};
    if (from) where.loggedAt.gte = new Date(from);
    if (to) where.loggedAt.lte = new Date(to);
  }
  const take = Math.min(Math.max(Number(pageSize) || 25, 1), 200);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
  const [data, total] = await Promise.all([
    prisma.logEntry.findMany({ where, skip, take, orderBy: [{ loggedAt: 'desc' }, { sourceId: 'asc' }, { lineNo: 'asc' }] }),
    prisma.logEntry.count({ where }),
  ]);
  res.json({ data, meta: { page: Number(page), pageSize: take, total, totalPages: Math.ceil(total / take) } });
};

exports.filters = async (req, res) => {
  const [sources, levels, categories] = await Promise.all([
    prisma.source.findMany({ select: { id: true, name: true } }),
    prisma.$queryRawUnsafe("SELECT DISTINCT level FROM log_entries ORDER BY level"),
    prisma.$queryRawUnsafe("SELECT DISTINCT category FROM log_entries WHERE category IS NOT NULL ORDER BY category"),
  ]);
  res.json({ data: { sources, levels: levels.map((r) => r.level), categories: categories.map((r) => r.category) } });
};

exports.read = async (req, res) => {
  const sourceId = Number(req.params.sourceId);
  const lineNo = Number(req.params.lineNo);
  const entry = await prisma.logEntry.findUnique({ where: { sourceId_lineNo: { sourceId, lineNo } } });
  if (!entry) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'log entry not found' } });
  res.json({ data: entry });
};
