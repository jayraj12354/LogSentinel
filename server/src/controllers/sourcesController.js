'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const where = req.query.active === 'true' ? { isActive: true } : {};
  const sources = await prisma.source.findMany({ where, orderBy: { id: 'asc' } });
  res.json({ data: sources });
};

exports.read = async (req, res) => {
  const id = Number(req.params.id);
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'source not found' } });
  res.json({ data: source });
};

exports.create = async (req, res) => {
  const { name, filePath, format, isActive } = req.body || {};
  if (!name) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name required' } });
  const source = await prisma.source.create({ data: { name, filePath, format: format || 'GENERIC', isActive: isActive !== false } });
  res.status(201).json({ data: source });
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const { filePath, format, isActive } = req.body || {};
  const source = await prisma.source.update({ where: { id }, data: { filePath, format, isActive } });
  res.json({ data: source });
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.source.delete({ where: { id } });
  res.json({ data: { deleted: true } });
};
