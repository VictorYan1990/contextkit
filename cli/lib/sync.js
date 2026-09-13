'use strict';

const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const log = require('./log');
const paths = require('./paths');
const mod = require('./module');
const links = require('./links');
const agentsmd = require('./agentsmd');

/**
 * Make sure `dir` is a clone of `source` at `ref`, and at `commit` if given.
 * Returns the actual HEAD.
 */
function ensureClone(dir, { source, ref, commit }, { update = false } = {}) {
  if (!git.isRepo(dir)) {
    if (fs.existsSync(dir)) {
      throw new Error(`${dir} exists but is not a git clone. Remove it and re-run.`);
    }
    log.step(`clone ${source} (${ref}) -> ${dir}`);
    git.clone(source, dir, ref);
  } else if (update) {
    log.step(`update ${dir} to tip of ${ref}`);
    const tip = git.updateTo(dir, ref);
    git.harden(dir);
    return tip;
  } else {
    git.harden(dir); // clones made by older versions get the same guards
  }
  let head = git.head(dir);
  if (commit && head !== commit) {
    if (git.checkoutCommit(dir, commit)) {
      head = commit;
    } else {
      log.warn(`could not check out pinned ${commit.slice(0, 7)} in ${dir}; staying at ${head.slice(0, 7)}`);
    }
  }
  return head;
}

/** Ordered [{name, dir, spec}] for central + manifest modules. */
function moduleList(root, manifest) {
  const list = [{ name: paths.CENTRAL, dir: paths.kitDir(root), spec: { source: manifest.source, ref: manifest.ref, commit: manifest.commit } }];
  for (const [name, spec] of Object.entries(manifest.modules)) {
    list.push({ name, dir: paths.moduleDir(root, name), spec });
  }
  return list;
}

/**
 * Bring the consumer in line with `manifest`: clones, links, AGENTS.md block,
 * CLAUDE.md, .gitignore. Mutates manifest (commits, copies). Does not write it.
 * opts.update: move clones to ref tips instead of pinned commits.
 * opts.only: Set of module names to update (with opts.update).
 */
function sync(root, manifest, opts = {}) {
  const mods = moduleList(root, manifest);
  for (const m of mods) {
    const doUpdate = Boolean(opts.update) && (!opts.only || opts.only.has(m.name));
    const head = ensureClone(m.dir, m.spec, { update: doUpdate });
    if (m.name === paths.CENTRAL) manifest.commit = head;
    else manifest.modules[m.name].commit = head;
  }

  const tool = links.wireToolLinks(root);
  manifest.copies = manifest.copies || {};
  const items = links.wireItems(root, mods, {
    mode: manifest.mode, copies: manifest.copies, force: opts.force,
    excludes: manifest.excludes || [], overrides: manifest.overrides || {},
  });
  if (manifest.mode === 'link') manifest.copies = {};

  const info = mods.map((m) => {
    const inv = mod.inventory(m.dir);
    return {
      name: m.name,
      version: inv.manifest?.version,
      commit: m.name === paths.CENTRAL ? manifest.commit : manifest.modules[m.name].commit,
      rules: inv.rules,
      knowledge: inv.knowledge,
    };
  });
  const block = agentsmd.upsertBlock(root, agentsmd.renderBlock(root, info));
  const claude = agentsmd.ensureClaudeMd(root);
  const ignore = agentsmd.ensureGitignore(root, `${paths.KIT_DIR}/`);

  return { tool, items, block, claude, ignore, modules: info };
}

function report(result) {
  const created = Object.values(result.tool).filter((v) => v === 'created').length;
  if (created) log.ok(`tool links: ${created} created`);
  const { items } = result;
  if (items.created.length) log.ok(`wired ${items.created.length} item(s): ${items.created.join(', ')}`);
  if (items.updated.length) log.ok(`updated ${items.updated.length} copy(ies): ${items.updated.join(', ')}`);
  if (items.removed.length) log.ok(`removed ${items.removed.length} stale item(s): ${items.removed.join(', ')}`);
  if (items.kept.length && !items.created.length) log.dim(`${items.kept.length} item(s) already wired`);
  if (result.block.status === 'merged') {
    log.ok(`AGENTS.md: replaced legacy section(s) with the managed block: ${result.block.removed.join(', ')}`);
    log.dim('  (the removed text is in git history; the managed block covers the same ground)');
  } else if (result.block.status !== 'unchanged') {
    log.ok(`AGENTS.md managed block ${result.block.status}`);
  }
  if (result.claude === 'created') log.ok('CLAUDE.md created');
  if (result.ignore === 'added') log.ok(`.gitignore: added ${paths.KIT_DIR}/`);
}

/** Every provided item across installed modules (collisions throw). */
function allItems(root, manifest) {
  return links.desiredItems(moduleList(root, manifest).filter((m) => fs.existsSync(m.dir)));
}

/** Ejected items whose upstream version changed since the eject, or vanished. */
function overrideDrift(root, manifest) {
  let all;
  try {
    all = allItems(root, manifest);
  } catch {
    return [];
  }
  const out = [];
  for (const [key, rec] of Object.entries(manifest.overrides || {})) {
    const item = all.get(key);
    if (!item) out.push({ key, state: 'gone' });
    else if (rec.hash && links.hashPath(item.targetAbs) !== rec.hash) out.push({ key, state: 'changed', module: item.module });
  }
  return out;
}

module.exports = { ensureClone, moduleList, sync, report, allItems, overrideDrift, path };
