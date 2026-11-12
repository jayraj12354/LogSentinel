'use strict';

const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const catchErrors = require('../middleware/catchErrors');
const c = require('../controllers/alertsController');

const r = express.Router();
r.get('/', auth, catchErrors(c.list));
r.get('/:id', auth, catchErrors(c.read));
r.patch('/:id/ack', auth, adminOnly, catchErrors(c.ack));
r.patch('/:id/resolve', auth, adminOnly, catchErrors(c.resolve));
module.exports = r;
