'use strict';

const log = require('../lib/log');
const paths = require('../lib/paths');
const manifestLib = require('../lib/manifest');
const links = require('../lib/links');
const { sync, report, allItems } = require('../lib/sync');

module.exports = {
  summary: 'Drop one kit skill or persona from this repository; update will not bring it back',
  usage: 'exclude <item>          (e.g. exclude capture-knowledge, exclude personas/planner.md)',
  run({ root, positionals }) {
    const spec = positionals[0];
    if (!spec) throw new Error('usage: contextkit exclude <item>');
    const manifest = manifestLib.read(root);
    if (!manifest) throw new Error(`${paths.MANIFEST} not found. Run \`contextkit init\` first.`);
    const key = links.resolveItemKey(allItems(root, manifest), spec);
    if (manifest.overrides[key]) throw new Error(`${key} is ejected; run \`contextkit restore ${key} --force\` first if you want to drop it`);
    if (manifest.excludes.includes(key)) {
      log.dim(`${key} is already excluded`);
      return 0;
    }
    manifest.excludes.push(key);
    const result = sync(root, manifest); // the stale-link sweep removes it
    manifestLib.write(root, manifest);
    report(result);
    log.ok(`excluded ${key}; \`contextkit restore ${key}\` brings it back`);
    return 0;
  },
};
