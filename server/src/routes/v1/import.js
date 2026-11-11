'use strict';

const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const catchErrors = require('../middleware/catchErrors');
const { importFile } = require('../services/importService');

const r = express.Router();
r.post('/:id/import', auth, adminOnly, catchErrors(async (req, res) => {
  const { filePath } = req.body || {};
  const id = Number(req.params.id);
  const result = await importFile(id, filePath);
  res.status(201).json({ data: result });
}));
module.exports = r;
