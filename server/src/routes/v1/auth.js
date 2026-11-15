'use strict';

const express = require('express');
const { loginThrottle } = require('../../middleware/rateLimit');
const { auth } = require('../../middleware/auth');
const catchErrors = require('../../middleware/catchErrors');
const c = require('../../controllers/authController');

const r = express.Router();
r.post('/login', loginThrottle, catchErrors(c.login));
r.get('/me', auth, catchErrors(c.me));
module.exports = r;
