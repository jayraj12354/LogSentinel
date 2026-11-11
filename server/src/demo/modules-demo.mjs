// SYLLABUS: Backend Development – Node.js fundamentals: ES modules
// Demonstrates import.meta.url (ESM has no __filename/__dirname by default).

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function describe() {
  return {
    moduleSystem: 'ESM',
    filename: path.basename(__filename),
    dirname: __dirname,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log('modules-demo.mjs (ESM)');
  console.log(describe());
}
