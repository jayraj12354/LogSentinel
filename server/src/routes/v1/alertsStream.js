'use strict';

const express = require('express');
const { auth } = require('../middleware/auth');
const { sseStream } = require('../controllers/alertStreamController');

const r = express.Router();
r.get('/stream', auth, sseStream);
module.exports = r;
