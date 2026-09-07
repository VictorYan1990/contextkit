'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { kitDir, CLI_ROOT, DEFAULT_REF } = require('./paths');
const { readJson } = require('./module');

const isUrlOrPath = (s) => /^[a-z][a-z0-9+.-]*:\/\//i.test(s) || /^[^/\\]+@[^:]+:/.test(s) || s.includes('/') || s.includes('\\') || s.startsWith('.');

/** Registry from the installed kit if present, else from the CLI's own checkout. */
function load(root) {
  const candidates = [path.join(kitDir(root), 'modules.json'), path.join(CLI_ROOT, 'modules.json')];
  for (const file of candidates) {
    const data = readJson(file);
    if (data && data.modules) return { file, modules: data.modules };
  }
  return { file: null, modules: {} };
}

/** Derive a module name from a git URL or path: strip `.git` and a `contextkit-` prefix. */
function nameFromSource(source) {
  const base = source.replace(/[/\\]+$/, '').split(/[/\\:]/).pop() || 'module';
  return base.replace(/\.git$/, '').replace(/^contextkit-/, '');
}

/**
 * Resolve `spec` (registry name, or git URL/path, optionally `#ref`) into
 * { name, source, ref, description }.
 */
function resolve(root, spec, { name, ref } = {}) {
  let s = spec;
  let specRef;
  const hash = s.lastIndexOf('#');
  if (hash > 0 && !/^[a-z]+:\/\//i.test(s.slice(hash))) {
    specRef = s.slice(hash + 1);
    s = s.slice(0, hash);
  }
  if (isUrlOrPath(s)) {
    return { name: name || nameFromSource(s), source: s, ref: ref || specRef || DEFAULT_REF, description: '' };
  }
  const reg = load(root);
  const entry = reg.modules[s];
  if (!entry) {
    const known = Object.keys(reg.modules);
    throw new Error(
      `Unknown module "${s}". Known: ${known.length ? known.join(', ') : '(none)'}. `
      + 'Pass a git URL to add an unregistered module.',
    );
  }
  return {
    name: name || s,
    source: entry.source,
    ref: ref || specRef || entry.ref || DEFAULT_REF,
    description: entry.description || '',
  };
}

module.exports = { load, resolve, nameFromSource, isUrlOrPath };
