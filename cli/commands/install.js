'use strict';

const log = require('../lib/log');
const paths = require('../lib/paths');
const manifestLib = require('../lib/manifest');
const { sync, report } = require('../lib/sync');
const doctor = require('./doctor');

module.exports = {
  summary: 'Restore .contextkit/ and all links from contextkit.json (fresh clone, CI)',
  usage: 'install [--force] [--no-doctor]',
  run({ root, flags }) {
    const manifest = manifestLib.read(root);
    if (!manifest) throw new Error(`${paths.MANIFEST} not found in ${root}. Run \`contextkit init\` first.`);
    const result = sync(root, manifest, { force: Boolean(flags.force) });
    manifestLib.write(root, manifest);
    report(result);
    log.ok(`installed central @ ${manifest.commit.slice(0, 7)}${Object.keys(manifest.modules).length ? ` + ${Object.keys(manifest.modules).join(', ')}` : ''}`);
    if (!flags['no-doctor']) {
      log.info('');
      return doctor.run({ root, flags: {} });
    }
    return 0;
  },
};
