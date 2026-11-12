'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { status, severity, page = 1, pageSize = 25 } = req.query;
  const where = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  const take = Math.min(Math.max(Number(pageSize), 1), 200);
  const skip = (Math.max(Number(page), 1) - 1) * take;
  const [data, total] = await Promise.all([
    prisma.alert.findMany({ where, skip, take, orderBy: { triggeredAt: 'desc' }, include: { policy: true, source: true } }),
    prisma.alert.count({ where }),
  ]);
  res.json({ data, meta: { page: Number(page), pageSize: take, total, totalPages: Math.ceil(total / take) } });
};

exports.read = async (req, res) => {
  const alert = await prisma.alert.findUnique({ where: { id: Number(req.params.id) }, include: { policy: true, source: true, acknowledger: true } });
  if (!alert) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'alert not found' } });
  res.json({ data: alert });
};

exports.ack = async (req, res) => {
  const id = Number(req.params.id);
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'alert not found' } });
  const updated = await prisma.alert.update({ where: { id }, data: { status: 'ACKNOWLEDGED', acknowledgedBy: req.user.id, acknowledgedAt: new Date() } });
  res.json({ data: updated });
};

exports.resolve = async (req, res) => {
  const id = Number(req.params.id);
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'alert not found' } });
  const updated = await prisma.alert.update({ where: { id }, data: { status: 'RESOLVED', acknowledgedBy: alert.status === 'OPEN' ? req.user.id : alert.acknowledgedBy, acknowledgedAt: new Date() } });
  res.json({ data: updated });
};
