#!/usr/bin/env node
'use strict';

// Standalone validator: `node scripts/validate.js [module-dir] [--strict]`.
const path = require('node:path');
const { validate } = require('../cli/lib/validate');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const dir = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
const { errors, warnings, summary, name } = validate(dir);

for (const w of warnings) console.log(`warn ${w}`);
for (const e of errors) console.log(`FAIL ${e}`);
console.log(`${name || path.basename(dir)}: ${summary}; ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length || (strict && warnings.length) ? 1 : 0);
