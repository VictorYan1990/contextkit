'use strict';

const fs = require('node:fs');
const path = require('node:path');
const log = require('../lib/log');
const paths = require('../lib/paths');
const manifestLib = require('../lib/manifest');
const links = require('../lib/links');
const { sync, report, allItems } = require('../lib/sync');

module.exports = {
  summary: 'Undo an eject or an exclude, re-linking the kit item',
  usage: 'restore <item> [--force]   (--force deletes an ejected project-owned copy)',
  run({ root, positionals, flags }) {
    const spec = positionals[0];
    if (!spec) throw new Error('usage: contextkit restore <item> [--force]');
    const manifest = manifestLib.read(root);
    if (!manifest) throw new Error(`${paths.MANIFEST} not found. Run \`contextkit init\` first.`);
    // Resolve against everything the kit provides plus whatever the manifest still records.
    const known = new Map(allItems(root, manifest));
    for (const k of manifest.excludes) known.set(k, known.get(k) || null);
    for (const k of Object.keys(manifest.overrides)) known.set(k, known.get(k) || null);
    const key = links.resolveItemKey(known, spec);

    if (manifest.excludes.includes(key)) {
      manifest.excludes = manifest.excludes.filter((k) => k !== key);
      const result = sync(root, manifest);
      manifestLib.write(root, manifest);
      report(result);
      log.ok(`restored ${key} (no longer excluded)`);
      return 0;
    }
    if (manifest.overrides[key]) {
      const dest = path.join(paths.agentsDir(root), key);
      if (fs.existsSync(dest) && !flags.force) {
        throw new Error(
          `${key} is ejected and .agents/${key} holds your project-owned copy. `
          + 'Re-run with --force to delete it and re-link the kit version (git history keeps your edits).',
        );
      }
      fs.rmSync(dest, { recursive: true, force: true });
      delete manifest.overrides[key];
      const result = sync(root, manifest);
      manifestLib.write(root, manifest);
      report(result);
      log.ok(`restored ${key} (re-linked to the kit version)`);
      return 0;
    }
    throw new Error(`${key} is neither ejected nor excluded; nothing to restore`);
  },
};
