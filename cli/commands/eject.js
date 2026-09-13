'use strict';

const log = require('../lib/log');
const paths = require('../lib/paths');
const manifestLib = require('../lib/manifest');
const links = require('../lib/links');
const { allItems } = require('../lib/sync');

module.exports = {
  summary: 'Turn one kit skill or persona into a project-owned copy that update leaves alone',
  usage: 'eject <item>            (e.g. eject code-reviewer, eject skills/skill-authoring)',
  run({ root, positionals }) {
    const spec = positionals[0];
    if (!spec) throw new Error('usage: contextkit eject <item>');
    const manifest = manifestLib.read(root);
    if (!manifest) throw new Error(`${paths.MANIFEST} not found. Run \`contextkit init\` first.`);
    const all = allItems(root, manifest);
    const key = links.resolveItemKey(all, spec);
    if (manifest.overrides[key]) {
      log.dim(`${key} is already ejected`);
      return 0;
    }
    if (manifest.excludes.includes(key)) throw new Error(`${key} is excluded; run \`contextkit restore ${key}\` first`);
    const item = all.get(key);
    manifest.copies = manifest.copies || {};
    const hash = links.ejectItem(root, item, key, manifest.copies);
    const commit = item.module === paths.CENTRAL ? manifest.commit : manifest.modules[item.module].commit;
    manifest.overrides[key] = { module: item.module, commit, hash };
    manifestLib.write(root, manifest);
    log.ok(`ejected ${key}: .agents/${key} is now a project-owned copy; update leaves it alone`);
    log.dim(`doctor and update report when module ${item.module} changes it upstream; \`contextkit restore ${key} --force\` re-links it`);
    return 0;
  },
};
