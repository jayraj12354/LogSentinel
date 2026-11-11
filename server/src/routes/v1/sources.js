'use strict';

const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const catchErrors = require('../middleware/catchErrors');
const c = require('../controllers/sourcesController');

const r = express.Router();
r.get('/', auth, catchErrors(c.list));
r.get('/:id', auth, catchErrors(c.read));
r.post('/', auth, adminOnly, catchErrors(c.create));
r.put('/:id', auth, adminOnly, catchErrors(c.update));
r.delete('/:id', auth, adminOnly, catchErrors(c.remove));
module.exports = r;
