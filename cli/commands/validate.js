'use strict';

const path = require('node:path');
const log = require('../lib/log');
const { validate } = require('../lib/validate');

module.exports = {
  summary: 'Validate a module directory against the contextkit contract',
  usage: 'validate [path] [--strict]',
  run({ positionals, flags, cwd }) {
    const dir = path.resolve(cwd, positionals[0] || '.');
    const { errors, warnings, summary, name } = validate(dir);
    for (const w of warnings) log.warn(w);
    for (const e of errors) log.fail(e);
    log.info(`${name || path.basename(dir)}: ${summary}; ${errors.length} error(s), ${warnings.length} warning(s)`);
    return errors.length || (flags.strict && warnings.length) ? 1 : 0;
  },
};
