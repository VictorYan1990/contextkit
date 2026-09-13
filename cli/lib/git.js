'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

class GitError extends Error {
  constructor(args, err) {
    const stderr = (err.stderr || '').toString().trim();
    super(`git ${args.join(' ')} failed${stderr ? `:\n${stderr}` : ''}`);
    this.name = 'GitError';
    this.args = args;
    this.stderr = stderr;
  }
}

/** Run git with argument vector (never a shell string). Returns trimmed stdout. */
function git(args, opts = {}) {
  try {
    return execFileSync('git', args, {
      cwd: opts.cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    }).trim();
  } catch (err) {
    throw new GitError(args, err);
  }
}

function tryGit(args, opts) {
  try {
    return git(args, opts);
  } catch {
    return null;
  }
}

const toplevel = (cwd) => tryGit(['rev-parse', '--show-toplevel'], { cwd });
const isRepo = (dir) => fs.existsSync(path.join(dir, '.git'));
const head = (dir) => git(['rev-parse', 'HEAD'], { cwd: dir });

/** Local directories become file:// URLs so `--depth` works and the path is absolute. */
function normalizeSource(src) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(src)) return src; // scheme://
  if (/^[^/\\]+@[^:]+:/.test(src)) return src; // scp-like user@host:path
  const abs = path.resolve(src);
  if (fs.existsSync(abs)) return pathToFileURL(abs).href;
  return src;
}

function clone(source, dest, ref) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const args = ['clone', '--quiet', '--depth', '1'];
  if (ref) args.push('--branch', ref);
  args.push(normalizeSource(source), dest);
  git(args);
  return head(dest);
}

/** Move a shallow clone to the tip of `ref` on origin. */
function updateTo(dir, ref) {
  git(['fetch', '--quiet', '--depth', '1', 'origin', ref], { cwd: dir });
  git(['checkout', '--quiet', '--detach', 'FETCH_HEAD'], { cwd: dir });
  return head(dir);
}

/** Try to check out an exact commit in a shallow clone. Returns true on success. */
function checkoutCommit(dir, commit) {
  if (tryGit(['fetch', '--quiet', '--depth', '1', 'origin', commit], { cwd: dir }) === null) {
    if (tryGit(['fetch', '--quiet', '--unshallow', 'origin'], { cwd: dir }) === null) {
      if (tryGit(['fetch', '--quiet', 'origin'], { cwd: dir }) === null) return false;
    }
  }
  return tryGit(['checkout', '--quiet', '--detach', commit], { cwd: dir }) !== null;
}

/** SHA of `ref` on a remote, or null if unreachable. */
function remoteHead(source, ref) {
  const out = tryGit(['ls-remote', normalizeSource(source), ref, `refs/tags/${ref}^{}`]);
  if (!out) return null;
  const lines = out.split('\n').filter(Boolean);
  // Prefer the peeled tag object if present.
  const peeled = lines.find((l) => l.endsWith('^{}'));
  return (peeled || lines[0]).split(/\s+/)[0] || null;
}

/** True when `rel` (relative to root) is gitignored. Requires a git repo. */
function isIgnored(root, rel) {
  if (!toplevel(root)) return false;
  return tryGit(['check-ignore', '-q', '--', rel], { cwd: root }) !== null;
}

/**
 * Index entries at or under `rel`: [{ mode, path }]. A symlink or file is one
 * entry at exactly `rel`; a tracked directory shows up as its children.
 */
function trackedEntries(root, rel) {
  const out = tryGit(['ls-files', '-s', '--', rel], { cwd: root });
  if (!out) return [];
  return out.split('\n').filter(Boolean).map((line) => {
    const [meta, p] = line.split('\t');
    return { mode: meta.split(/\s+/)[0], path: p };
  });
}

/** Index mode of exactly `rel` (e.g. '120000' for a symlink), or null if that path is not tracked. */
function trackedMode(root, rel) {
  const want = rel.split(path.sep).join('/');
  const hit = trackedEntries(root, rel).find((e) => e.path === want);
  return hit ? hit.mode : null;
}

/** True when git tracks files *under* `rel` (a former directory) rather than `rel` itself. */
function tracksChildren(root, rel) {
  const want = rel.split(path.sep).join('/');
  return trackedEntries(root, rel).some((e) => e.path !== want && e.path.startsWith(`${want}/`));
}

module.exports = {
  GitError, git, tryGit, toplevel, isRepo, head, normalizeSource, clone, updateTo,
  checkoutCommit, remoteHead, isIgnored, trackedEntries, trackedMode, tracksChildren,
};
