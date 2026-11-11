'use strict';

const express = require('express');
const { loginThrottle } = require('../middleware/rateLimit');
const { auth } = require('../middleware/auth');
const c = require('../controllers/authController');

const r = express.Router();
r.post('/login', loginThrottle, c.login);
r.get('/me', auth, c.me);
module.exports = r;
