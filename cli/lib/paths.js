'use strict';

const path = require('node:path');
const git = require('./git');

const KIT_DIR = '.contextkit';
const MANIFEST = 'contextkit.json';
const MODULES_DIR = 'modules';
const AGENTS_DIR = '.agents';
const CENTRAL = 'central';
const DEFAULT_SOURCE = 'https://github.com/VictorYan1990/contextkit.git';
const DEFAULT_REF = 'main';
/** Root of the contextkit checkout that this CLI is running from. */
const CLI_ROOT = path.resolve(__dirname, '..', '..');

const toPosix = (p) => p.split(path.sep).join('/');

/** The consuming repository root: --root, else the git top level, else cwd. */
function findRoot(cwd, explicit) {
  if (explicit) return path.resolve(explicit);
  return git.toplevel(cwd) || path.resolve(cwd);
}

const kitDir = (root) => path.join(root, KIT_DIR);
const manifestPath = (root) => path.join(root, MANIFEST);
const agentsDir = (root) => path.join(root, AGENTS_DIR);

/** Absolute directory of an installed module. `central` is the kit dir itself. */
function moduleDir(root, name) {
  return name === CENTRAL ? kitDir(root) : path.join(kitDir(root), MODULES_DIR, name);
}

/** Module dir relative to the consumer root, posix, e.g. `.contextkit/modules/x`. */
function moduleRel(name) {
  return name === CENTRAL ? KIT_DIR : `${KIT_DIR}/${MODULES_DIR}/${name}`;
}

module.exports = {
  KIT_DIR, MANIFEST, MODULES_DIR, AGENTS_DIR, CENTRAL, DEFAULT_SOURCE, DEFAULT_REF, CLI_ROOT,
  toPosix, findRoot, kitDir, manifestPath, agentsDir, moduleDir, moduleRel,
};
