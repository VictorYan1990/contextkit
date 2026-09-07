'use strict';

const log = require('../lib/log');
const paths = require('../lib/paths');
const manifestLib = require('../lib/manifest');
const registry = require('../lib/registry');
const { sync, report } = require('../lib/sync');

module.exports = {
  summary: 'Add a sub-module by registry name or git URL',
  usage: 'add <name|git-url>[#ref] [--name <name>] [--ref <branch|tag>]',
  run({ root, positionals, flags }) {
    const spec = positionals[0];
    if (!spec) throw new Error('usage: contextkit add <name|git-url>');
    const manifest = manifestLib.read(root);
    if (!manifest) throw new Error(`${paths.MANIFEST} not found. Run \`contextkit init\` first.`);
    const r = registry.resolve(root, spec, { name: flags.name, ref: flags.ref });
    if (r.name === paths.CENTRAL) throw new Error('"central" is reserved for the main module');
    if (manifest.modules[r.name]) throw new Error(`module "${r.name}" is already installed (use \`update ${r.name}\`)`);
    manifest.modules[r.name] = { source: r.source, ref: r.ref, commit: null };
    let result;
    try {
      result = sync(root, manifest, { force: Boolean(flags.force) });
    } catch (err) {
      delete manifest.modules[r.name];
      throw err;
    }
    manifestLib.write(root, manifest);
    report(result);
    log.ok(`added module ${r.name} @ ${manifest.modules[r.name].commit.slice(0, 7)}${r.description ? ` — ${r.description}` : ''}`);
    return 0;
  },
};
