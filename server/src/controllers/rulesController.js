'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const rules = await prisma.rule.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
  res.json({ data: rules });
};

exports.create = async (req, res) => {
  const { name, pattern, flags, category, severity, isActive } = req.body || {};
  if (!name || !pattern || !category || !severity) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name, pattern, category, severity required' } });
  }
  try { new RegExp(pattern, flags || 'i'); } catch (e) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'invalid regex' } });
  }
  const rule = await prisma.rule.create({ data: { name, pattern, flags: flags || 'i', category, severity, isActive: isActive !== false } });
  res.status(201).json({ data: rule });
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const { pattern, flags, category, severity, isActive } = req.body || {};
  if (pattern || flags) {
    try { new RegExp(pattern, flags || 'i'); } catch (e) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'invalid regex' } });
    }
  }
  const rule = await prisma.rule.update({ where: { id }, data: { pattern, flags, category, severity, isActive } });
  res.json({ data: rule });
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.rule.delete({ where: { id } });
  res.json({ data: { deleted: true } });
};

exports.test = (req, res) => {
  const { pattern, flags, sample } = req.body || {};
  if (!pattern || sample === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'pattern and sample required' } });
  }
  try {
    const re = new RegExp(pattern, flags || 'i');
    res.json({ data: { matched: re.test(sample) } });
  } catch (e) {
    res.json({ data: { matched: false, error: e.message } });
  }
};
