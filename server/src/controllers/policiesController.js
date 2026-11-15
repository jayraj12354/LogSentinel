'use strict';

const { prisma } = require('../config/db');

const positiveInts = (...vals) => vals.every((v) => v === undefined || (Number.isInteger(v) && v > 0));
const BAD_NUMBERS = { error: { code: 'VALIDATION_ERROR', message: 'threshold and window must be whole numbers above 0' } };

exports.list = async (req, res) => {
  const policies = await prisma.alertPolicy.findMany({ orderBy: { id: 'asc' } });
  res.json({ data: policies });
};

exports.create = async (req, res) => {
  const { name, category, thresholdCount, windowSeconds, groupBy, severity } = req.body || {};
  if (!name || !category || !thresholdCount || !windowSeconds || !severity) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'all fields required' } });
  }
  if (!positiveInts(thresholdCount, windowSeconds)) return res.status(400).json(BAD_NUMBERS);
  const policy = await prisma.alertPolicy.create({ data: { name, category, thresholdCount, windowSeconds, groupBy: groupBy || 'IP', severity } });
  res.status(201).json({ data: policy });
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const { name, category, thresholdCount, windowSeconds, groupBy, severity, isActive } = req.body || {};
  if (!positiveInts(thresholdCount, windowSeconds)) return res.status(400).json(BAD_NUMBERS);
  const policy = await prisma.alertPolicy.update({ where: { id }, data: { name, category, thresholdCount, windowSeconds, groupBy, severity, isActive } });
  res.json({ data: policy });
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.alertPolicy.delete({ where: { id } });
  res.json({ data: { deleted: true } });
};
