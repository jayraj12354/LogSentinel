'use strict';

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeSelect = { id: true, username: true, email: true, role: true, createdAt: true };

exports.list = async (req, res) => {
  const users = await prisma.user.findMany({ select: safeSelect, orderBy: { id: 'asc' } });
  res.json({ data: users });
};

exports.create = async (req, res) => {
  const { username, email, password, role } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'username, email, password required' } });
  }
  const exists = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (exists) return res.status(409).json({ error: { code: 'CONFLICT', message: 'user already exists' } });
  const user = await prisma.user.create({
    data: { username, email, passwordHash: await bcrypt.hash(password, 10), role: role === 'ADMIN' ? 'ADMIN' : 'VIEWER' },
    select: safeSelect,
  });
  res.status(201).json({ data: user });
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'invalid id' } });
  await prisma.user.delete({ where: { id } });
  res.json({ data: { deleted: true } });
};

exports.read = async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id }, select: safeSelect });
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'user not found' } });
  res.json({ data: user });
};
