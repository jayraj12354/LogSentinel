'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('../config/env');
const prisma = new PrismaClient();

exports.login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'username and password required' } });
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'bad credentials' } });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  res.json({ data: { token, user: { id: user.id, username: user.username, role: user.role } } });
};

exports.me = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, username: true, email: true, role: true, createdAt: true } });
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'user not found' } });
  res.json({ data: user });
};
