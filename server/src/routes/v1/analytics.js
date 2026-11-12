'use strict';

const express = require('express');
const { auth } = require('../middleware/auth');
const catchErrors = require('../middleware/catchErrors');
const c = require('../controllers/analyticsController');

const r = express.Router();
r.get('/summary', auth, catchErrors(c.summary));
r.get('/file-vs-sql', auth, catchErrors(c.fileVsSql));
r.get('/:name/sql', auth, catchErrors(c.getSql));
r.get('/:name', auth, catchErrors(c.runCatalogued));
module.exports = r;
