'use strict';

const log = require('../lib/log');
const git = require('../lib/git');
const paths = require('../lib/paths');
const manifestLib = require('../lib/manifest');
const registry = require('../lib/registry');
const mod = require('../lib/module');
const { moduleList } = require('../lib/sync');

module.exports = {
  summary: 'List installed modules (or --available for the registry)',
  usage: 'list [--available] [--offline] [--json]',
  run({ root, flags }) {
    if (flags.available) {
      const reg = registry.load(root);
      if (flags.json) { console.log(JSON.stringify(reg.modules, null, 2)); return 0; }
      log.info(`registry: ${reg.file || '(none found)'}`);
      for (const [name, e] of Object.entries(reg.modules)) log.info(`  ${name.padEnd(16)} ${e.source} @ ${e.ref || paths.DEFAULT_REF}${e.description ? `\n${' '.repeat(19)}${e.description}` : ''}`);
      return 0;
    }
    const manifest = manifestLib.read(root);
    if (!manifest) throw new Error(`${paths.MANIFEST} not found in ${root}.`);
    const rows = moduleList(root, manifest).map((m) => {
      const inv = git.isRepo(m.dir) ? mod.inventory(m.dir) : null;
      const row = {
        name: m.name,
        version: inv?.manifest?.version || null,
        source: m.spec.source,
        ref: m.spec.ref,
        commit: m.spec.commit,
        installed: Boolean(inv),
        skills: inv ? inv.skills.length : 0,
        personas: inv ? inv.personas.length : 0,
        rules: inv ? inv.rules.length : 0,
        latest: null,
      };
      if (!flags.offline) row.latest = git.remoteHead(m.spec.source, m.spec.ref);
      return row;
    });
    if (flags.json) { console.log(JSON.stringify(rows, null, 2)); return 0; }
    for (const r of rows) {
      const state = !r.installed ? 'MISSING' : r.latest === null ? 'remote unknown' : r.latest === r.commit ? 'up to date' : `behind (${r.latest.slice(0, 7)} available)`;
      log.info(`${r.name.padEnd(12)} ${(r.version ? `v${r.version}` : '-').padEnd(9)} ${(r.commit || '-').slice(0, 7)}  ${r.ref.padEnd(8)} ${state}`);
      log.dim(`${' '.repeat(13)}${r.skills} skill(s), ${r.personas} persona(s), ${r.rules} rule(s)  ${r.source}`);
    }
    return 0;
  },
};
