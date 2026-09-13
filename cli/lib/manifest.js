'use strict';

const fs = require('node:fs');
const { manifestPath } = require('./paths');

function read(root) {
  const file = manifestPath(root);
  if (!fs.existsSync(file)) return null;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${file} is not valid JSON: ${err.message}`);
  }
  data.modules = data.modules || {};
  data.mode = data.mode || 'link';
  data.overrides = data.overrides || {};
  data.excludes = data.excludes || [];
  return data;
}

function write(root, manifest) {
  const ordered = {
    source: manifest.source,
    ref: manifest.ref,
    commit: manifest.commit,
    mode: manifest.mode || 'link',
    modules: manifest.modules || {},
  };
  if (manifest.excludes && manifest.excludes.length) ordered.excludes = [...manifest.excludes].sort();
  if (manifest.overrides && Object.keys(manifest.overrides).length) ordered.overrides = manifest.overrides;
  if (manifest.copies && Object.keys(manifest.copies).length) ordered.copies = manifest.copies;
  fs.writeFileSync(manifestPath(root), `${JSON.stringify(ordered, null, 2)}\n`);
  return ordered;
}

function create({ source, ref, commit, mode }) {
  return { source, ref, commit: commit || null, mode: mode || 'link', modules: {}, overrides: {}, excludes: [] };
}

module.exports = { read, write, create };
