'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { prisma } = require('../config/db');

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'missing token' } });
  }
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (e) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'invalid token' } });
  }
}

// Checks the database, not the token: a deleted admin's token keeps working until it expires otherwise.
async function adminOnly(req, res, next) {
  try {
    const user = req.user && await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
    if (user && user.role === 'ADMIN') return next();
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'admin only' } });
  } catch (e) {
    next(e);
  }
}

module.exports = { auth, adminOnly };
