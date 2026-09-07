'use strict';

const fs = require('node:fs');
const log = require('../lib/log');
const paths = require('../lib/paths');
const manifestLib = require('../lib/manifest');
const registry = require('../lib/registry');
const { sync, report, ensureClone } = require('../lib/sync');
const doctor = require('./doctor');

module.exports = {
  summary: 'Install the central module into this repository and wire it',
  usage: 'init [--source <git-url>] [--ref <branch|tag>] [--mode link|copy] [--with <module|url>]... [--no-doctor]',
  run({ root, flags }) {
    let manifest = manifestLib.read(root);
    if (manifest) {
      log.warn(`${paths.MANIFEST} already exists; running install instead (use \`add\` for more modules)`);
    } else {
      const mode = flags.mode || 'link';
      if (!['link', 'copy'].includes(mode)) throw new Error(`--mode must be link or copy, got ${mode}`);
      manifest = manifestLib.create({ source: flags.source || paths.DEFAULT_SOURCE, ref: flags.ref || paths.DEFAULT_REF, mode });
    }
    // Central first, so the registry inside the clone is available for --with names.
    manifest.commit = ensureClone(paths.kitDir(root), manifest);
    for (const spec of flags.with || []) {
      const r = registry.resolve(root, spec);
      if (manifest.modules[r.name]) { log.dim(`module ${r.name} already listed`); continue; }
      manifest.modules[r.name] = { source: r.source, ref: r.ref, commit: null };
    }
    const result = sync(root, manifest, { force: Boolean(flags.force) });
    manifestLib.write(root, manifest);
    report(result);
    log.ok(`${paths.MANIFEST} written (central @ ${manifest.commit.slice(0, 7)}${Object.keys(manifest.modules).length ? `, modules: ${Object.keys(manifest.modules).join(', ')}` : ''})`);
    if (!flags['no-doctor']) {
      log.info('');
      return doctor.run({ root, flags: {} });
    }
    return 0;
  },
};
// Silence unused warning for fs in some linters.
void fs;
