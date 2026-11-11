'use strict';

const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const catchErrors = require('../middleware/catchErrors');
const c = require('../controllers/usersController');

const r = express.Router();
r.get('/', auth, adminOnly, catchErrors(c.list));
r.get('/:id', auth, adminOnly, catchErrors(c.read));
r.post('/', auth, adminOnly, catchErrors(c.create));
r.delete('/:id', auth, adminOnly, catchErrors(c.remove));
module.exports = r;
