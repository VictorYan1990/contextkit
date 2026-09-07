'use strict';

const fs = require('node:fs');
const log = require('../lib/log');
const paths = require('../lib/paths');
const manifestLib = require('../lib/manifest');
const links = require('../lib/links');
const agentsmd = require('../lib/agentsmd');
const { sync, report } = require('../lib/sync');

module.exports = {
  summary: 'Remove a sub-module, or --all to uninstall contextkit from this repository',
  usage: 'remove <name> | remove --all',
  run({ root, positionals, flags }) {
    const manifest = manifestLib.read(root);
    if (!manifest) throw new Error(`${paths.MANIFEST} not found; nothing to remove.`);
    if (flags.all) {
      const removed = links.unwireAll(root, manifest.copies || {});
      fs.rmSync(paths.kitDir(root), { recursive: true, force: true });
      fs.rmSync(paths.manifestPath(root), { force: true });
      const block = agentsmd.removeBlock(root);
      log.ok(`removed ${removed.length} item(s), ${paths.KIT_DIR}/, ${paths.MANIFEST}; AGENTS.md block ${block}`);
      log.dim('Tool links and CLAUDE.md were kept; they serve your own .agents/ content.');
      return 0;
    }
    const name = positionals[0];
    if (!name) throw new Error('usage: contextkit remove <name> | --all');
    if (name === paths.CENTRAL) throw new Error('central cannot be removed alone; use `remove --all`');
    if (!manifest.modules[name]) throw new Error(`module "${name}" is not installed`);
    delete manifest.modules[name];
    fs.rmSync(paths.moduleDir(root, name), { recursive: true, force: true });
    const result = sync(root, manifest); // drops stale links, refreshes block
    manifestLib.write(root, manifest);
    report(result);
    log.ok(`removed module ${name}`);
    return 0;
  },
};
