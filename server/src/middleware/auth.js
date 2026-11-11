'use strict';

const jwt = require('jsonwebtoken');
const config = require('./config/env');

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

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  res.status(403).json({ error: { code: 'FORBIDDEN', message: 'admin only' } });
}

module.exports = { auth, adminOnly };
