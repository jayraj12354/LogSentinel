'use strict';

const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const catchErrors = require('../middleware/catchErrors');
const c = require('../controllers/policiesController');

const r = express.Router();
r.get('/', auth, catchErrors(c.list));
r.post('/', auth, adminOnly, catchErrors(c.create));
r.put('/:id', auth, adminOnly, catchErrors(c.update));
r.delete('/:id', auth, adminOnly, catchErrors(c.remove));
module.exports = r;
