'use strict';

const fs = require('node:fs');
const path = require('node:path');
const log = require('../lib/log');
const paths = require('../lib/paths');
const doctor = require('../lib/doctor');
const { validate } = require('../lib/validate');

module.exports = {
  summary: 'Check links, manifest, clones, and collisions; exit 1 on failure. Never writes.',
  usage: 'doctor',
  run({ root }) {
    // Inside a module repo (no manifest, has module.json): validate instead.
    if (!fs.existsSync(paths.manifestPath(root)) && fs.existsSync(path.join(root, 'module.json'))) {
      const { errors, warnings, summary } = validate(root);
      for (const w of warnings) log.warn(w);
      for (const e of errors) log.fail(e);
      log.info(`module checkout: ${summary}`);
      return errors.length ? 1 : 0;
    }
    const { ok, checks } = doctor.run(root);
    for (const c of checks) {
      if (c.level === 'ok') log.ok(c.msg);
      else if (c.level === 'warn') log.warn(c.msg);
      else log.fail(c.msg);
    }
    log.info(ok ? 'doctor: all checks passed' : 'doctor: FAILED');
    return ok ? 0 : 1;
  },
};
