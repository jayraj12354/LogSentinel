'use strict';

// SYLLABUS: Backend Development – Node.js fundamentals: CommonJS modules
// Demonstrates require/module.exports and __filename/__dirname.

const path = require('path');

function describe() {
  return {
    moduleSystem: 'CommonJS',
    filename: path.basename(__filename),
    dirname: __dirname,
  };
}

if (require.main === module) {
  console.log('modules-demo.cjs (CommonJS)');
  console.log(describe());
}

module.exports = { describe };
