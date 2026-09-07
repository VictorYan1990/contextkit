'use strict';

const log = require('../lib/log');
const paths = require('../lib/paths');
const manifestLib = require('../lib/manifest');
const { sync, report, moduleList } = require('../lib/sync');
const links = require('../lib/links');

module.exports = {
  summary: 'Move module(s) to the tip of their pinned ref and re-wire',
  usage: 'update [<name>...] [--all] [--force]',
  run({ root, positionals, flags }) {
    const manifest = manifestLib.read(root);
    if (!manifest) throw new Error(`${paths.MANIFEST} not found. Run \`contextkit init\` first.`);
    const names = positionals.length && !flags.all ? new Set(positionals) : null;
    if (names) {
      for (const n of names) {
        if (n !== paths.CENTRAL && !manifest.modules[n]) throw new Error(`module "${n}" is not installed`);
      }
    }
    const before = safeItems(root, manifest);
    const prevCommits = snapshot(manifest);
    const result = sync(root, manifest, { update: true, only: names, force: Boolean(flags.force) });
    manifestLib.write(root, manifest);
    report(result);
    for (const m of moduleList(root, manifest)) {
      const was = prevCommits[m.name];
      const now = m.name === paths.CENTRAL ? manifest.commit : manifest.modules[m.name].commit;
      if (was !== now) log.ok(`${m.name}: ${(was || 'none').slice(0, 7)} -> ${now.slice(0, 7)}`);
      else log.dim(`${m.name}: unchanged @ ${now.slice(0, 7)}`);
    }
    const after = safeItems(root, manifest);
    const added = [...after].filter((k) => !before.has(k));
    const gone = [...before].filter((k) => !after.has(k));
    if (added.length) log.info(`  new items: ${added.join(', ')}`);
    if (gone.length) log.info(`  removed items: ${gone.join(', ')}`);
    return 0;
  },
};

function snapshot(manifest) {
  const out = { [paths.CENTRAL]: manifest.commit };
  for (const [n, s] of Object.entries(manifest.modules)) out[n] = s.commit;
  return out;
}

function safeItems(root, manifest) {
  try {
    return new Set(links.desiredItems(moduleList(root, manifest).filter((m) => require('node:fs').existsSync(m.dir))).keys());
  } catch {
    return new Set();
  }
}
