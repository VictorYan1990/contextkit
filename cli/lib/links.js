'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { toPosix, agentsDir, KIT_DIR } = require('./paths');
const mod = require('./module');

const TOOL_LINKS = [
  ['.claude/skills', '.agents/skills'],
  ['.claude/agents', '.agents/personas'],
  ['.cursor/skills', '.agents/skills'],
  ['.cursor/agents', '.agents/personas'],
];

const EPERM_HELP = [
  'Cannot create a symlink (EPERM). On Windows this means Developer Mode is off.',
  'Enable it once (elevated PowerShell), then re-run:',
  "  Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModelUnlock' -Name AllowDevelopmentWithoutDevLicense -Value 1",
  '  git config core.symlinks true',
  'Or re-run with `--mode copy` to install tracked copies instead of links.',
].join('\n');

function lstat(p) {
  return fs.lstatSync(p, { throwIfNoEntry: false });
}
const isSymlink = (p) => Boolean(lstat(p)?.isSymbolicLink());
const exists = (p) => lstat(p) !== undefined;

class CollisionError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'CollisionError';
  }
}

/** Create or fix a relative symlink at `linkAbs` pointing to `targetAbs`. */
function ensureSymlink(linkAbs, targetAbs, type) {
  const rel = toPosix(path.relative(path.dirname(linkAbs), targetAbs));
  const st = lstat(linkAbs);
  if (st) {
    if (st.isSymbolicLink()) {
      if (toPosix(fs.readlinkSync(linkAbs)) === rel) return 'ok';
      fs.unlinkSync(linkAbs);
    } else {
      throw new CollisionError(
        `${linkAbs} exists and is not a symlink. Move its contents aside (or into .agents/) and re-run.`,
      );
    }
  }
  fs.mkdirSync(path.dirname(linkAbs), { recursive: true });
  try {
    fs.symlinkSync(rel, linkAbs, type);
  } catch (err) {
    if (err.code === 'EPERM') throw new Error(EPERM_HELP);
    throw err;
  }
  return 'created';
}

/** The four tool links plus the `.agents/{skills,personas}` directories. */
function wireToolLinks(root) {
  fs.mkdirSync(path.join(agentsDir(root), 'skills'), { recursive: true });
  fs.mkdirSync(path.join(agentsDir(root), 'personas'), { recursive: true });
  const results = {};
  for (const [link, target] of TOOL_LINKS) {
    results[link] = ensureSymlink(path.join(root, link), path.join(root, target), 'dir');
  }
  return results;
}

/** A symlink under .agents/ is kit-owned when its target points into .contextkit/. */
function isKitLink(linkAbs) {
  if (!isSymlink(linkAbs)) return false;
  const target = toPosix(fs.readlinkSync(linkAbs));
  return target.startsWith(`../../${KIT_DIR}/`);
}

function hashPath(p) {
  const h = crypto.createHash('sha256');
  const walk = (q) => {
    const st = fs.statSync(q);
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(q).sort()) walk(path.join(q, name));
    } else {
      h.update(toPosix(path.relative(p, q)));
      h.update(fs.readFileSync(q));
    }
  };
  walk(p);
  return h.digest('hex');
}

/**
 * Desired items across modules: key -> { module, targetAbs, type, kind, name }.
 * Throws CollisionError when two modules provide the same key.
 */
function desiredItems(modules) {
  const items = new Map();
  for (const m of modules) {
    const inv = mod.inventory(m.dir);
    for (const s of inv.skills) put(items, `skills/${s.name}`, { module: m.name, targetAbs: s.path, type: 'dir', kind: 'skill', name: s.name });
    for (const p of inv.personas) put(items, `personas/${p.file}`, { module: m.name, targetAbs: p.path, type: 'file', kind: 'persona', name: p.name });
  }
  return items;
}

function put(items, key, item) {
  const prev = items.get(key);
  if (prev) {
    throw new CollisionError(
      `Both module "${prev.module}" and module "${item.module}" provide ${key}. `
      + 'Rename one of them upstream, or remove one module.',
    );
  }
  items.set(key, item);
}

/** Keys the kit should wire: every provided item minus excluded and ejected ones. */
function activeItems(all, { excludes = [], overrides = {} } = {}) {
  return new Map([...all].filter(([k]) => !excludes.includes(k) && !Object.hasOwn(overrides, k)));
}

/**
 * Resolve a user-typed item spec to a key in `items`: accepts "skill-authoring",
 * "skills/skill-authoring", "code-reviewer", "code-reviewer.md", "personas/code-reviewer.md".
 */
function resolveItemKey(items, spec) {
  const s = spec.replace(/^\.agents\//, '').replace(/\/$/, '');
  const candidates = [s, `skills/${s}`, `personas/${s}`, `personas/${s}.md`, `${s}.md`];
  const hits = [...new Set(candidates.filter((c) => items.has(c)))];
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) throw new Error(`"${spec}" is ambiguous: ${hits.join(', ')}. Use the full key.`);
  throw new Error(`No kit item matches "${spec}". Known: ${[...items.keys()].join(', ') || '(none)'}`);
}

/**
 * Make `key` project-owned: replace the kit link (or tracked copy) at that
 * path with a copy of the upstream item, or — when a real file or directory
 * is already sitting there uninstalled (a pre-existing project file that
 * collides with a kit item name) — leave it untouched and adopt it in place.
 * Either way, this never overwrites content that isn't a kit link or a
 * recorded copy. Returns the upstream content hash for drift detection.
 */
function ejectItem(root, item, key, copies = {}) {
  const dest = path.join(agentsDir(root), key);
  const upstream = hashPath(item.targetAbs);
  if (isKitLink(dest)) {
    fs.unlinkSync(dest);
  } else if (Object.hasOwn(copies, key)) {
    delete copies[key]; // already a real copy; it just stops being tracked
    return upstream;
  } else if (exists(dest)) {
    return upstream; // pre-existing real file at this path — adopt as-is, untouched
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(item.targetAbs, dest, { recursive: true });
  return upstream;
}

/**
 * Wire every module item into `.agents/`. `modules` is [{name, dir}] with central first.
 * mode: 'link' | 'copy'. `copies` is the manifest's recorded hashes (mutated in copy mode).
 * `excludes` (keys) are never wired; `overrides` (keys) are project-owned and left alone.
 * Returns { created, kept, removed, updated }.
 */
function wireItems(root, modules, { mode = 'link', copies = {}, force = false, excludes = [], overrides = {} } = {}) {
  const desired = activeItems(desiredItems(modules), { excludes, overrides });
  const base = agentsDir(root);
  const result = { created: [], kept: [], removed: [], updated: [] };

  // Remove stale kit-owned entries.
  for (const sub of ['skills', 'personas']) {
    const dir = path.join(base, sub);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of fs.readdirSync(dir)) {
      const key = `${sub}/${name}`;
      const abs = path.join(dir, name);
      const owned = isKitLink(abs) || Object.hasOwn(copies, key);
      if (owned && !desired.has(key)) {
        fs.rmSync(abs, { recursive: true, force: true });
        delete copies[key];
        result.removed.push(key);
      }
    }
  }

  for (const [key, item] of desired) {
    const dest = path.join(base, key);
    if (mode === 'link') {
      if (exists(dest) && !isKitLink(dest) && !Object.hasOwn(copies, key)) {
        throw new CollisionError(
          `${key} already exists in .agents/ and is project-owned, but module "${item.module}" provides it. `
          + `To keep it: \`contextkit eject ${item.name}\` (adopts it as a project-owned override, `
          + 'untouched, and future updates leave it alone). Otherwise rename the project item or remove '
          + 'the module. Never just delete it to make this error go away — that discards its content for good.',
        );
      }
      if (Object.hasOwn(copies, key)) {
        fs.rmSync(dest, { recursive: true, force: true }); // switching copy -> link
        delete copies[key];
      }
      const r = ensureSymlink(dest, item.targetAbs, item.type);
      (r === 'created' ? result.created : result.kept).push(key);
    } else {
      const fresh = hashPath(item.targetAbs);
      if (exists(dest)) {
        if (isKitLink(dest)) {
          fs.unlinkSync(dest); // switching link -> copy
        } else if (Object.hasOwn(copies, key)) {
          const current = hashPath(dest);
          if (current === fresh) { result.kept.push(key); continue; }
          if (current !== copies[key] && !force) {
            throw new CollisionError(
              `${key} was installed as a copy and has been modified locally. `
              + 'Revert it, move your change upstream, or re-run with --force to overwrite.',
            );
          }
          fs.rmSync(dest, { recursive: true, force: true });
          result.updated.push(key);
        } else {
          throw new CollisionError(
            `${key} already exists in .agents/ and is project-owned, but module "${item.module}" provides it. `
            + `To keep it: \`contextkit eject ${item.name}\`. Never just delete it to make this error go `
            + 'away — that discards its content for good.',
          );
        }
      } else {
        result.created.push(key);
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(item.targetAbs, dest, { recursive: true });
      copies[key] = fresh;
    }
  }
  return result;
}

/** Remove every kit-owned entry (links and recorded copies). */
function unwireAll(root, copies = {}) {
  const base = agentsDir(root);
  const removed = [];
  for (const sub of ['skills', 'personas']) {
    const dir = path.join(base, sub);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const key = `${sub}/${name}`;
      const abs = path.join(dir, name);
      if (isKitLink(abs) || Object.hasOwn(copies, key)) {
        fs.rmSync(abs, { recursive: true, force: true });
        delete copies[key];
        removed.push(key);
      }
    }
  }
  return removed;
}

module.exports = {
  TOOL_LINKS, CollisionError, ensureSymlink, wireToolLinks, wireItems, unwireAll, desiredItems, activeItems,
  resolveItemKey, ejectItem, isKitLink, isSymlink, hashPath,
};
