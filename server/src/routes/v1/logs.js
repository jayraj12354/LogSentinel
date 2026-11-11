'use strict';

const express = require('express');
const { auth } = require('../middleware/auth');
const catchErrors = require('../middleware/catchErrors');
const c = require('../controllers/logsController');

const r = express.Router();
r.get('/', auth, catchErrors(c.list));
r.get('/filters', auth, catchErrors(c.filters));
r.get('/:sourceId/:lineNo', auth, catchErrors(c.read));
module.exports = r;
