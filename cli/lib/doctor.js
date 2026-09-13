'use strict';

const fs = require('node:fs');
const path = require('node:path');
const git = require('./git');
const paths = require('./paths');
const manifestLib = require('./manifest');
const links = require('./links');
const agentsmd = require('./agentsmd');
const { toPosix } = paths;

/**
 * Run all consumer checks. Returns { ok, checks: [{ level: 'ok'|'warn'|'fail', msg }] }.
 * Never writes.
 */
function run(root) {
  const checks = [];
  const ok = (msg) => checks.push({ level: 'ok', msg });
  const warn = (msg) => checks.push({ level: 'warn', msg });
  const fail = (msg) => checks.push({ level: 'fail', msg });
  const inGit = Boolean(git.toplevel(root));

  let manifest = null;
  try {
    manifest = manifestLib.read(root);
  } catch (err) {
    fail(err.message);
  }
  if (!manifest) {
    fail(`${paths.MANIFEST} not found in ${root}. Run \`contextkit init\`.`);
    return finish(checks);
  }
  ok(`${paths.MANIFEST}: source ${manifest.source} @ ${manifest.ref}, mode ${manifest.mode}`);

  // Clones
  const mods = [{ name: paths.CENTRAL, dir: paths.kitDir(root), spec: manifest }];
  for (const [name, spec] of Object.entries(manifest.modules)) mods.push({ name, dir: paths.moduleDir(root, name), spec });
  const present = [];
  for (const m of mods) {
    const rel = paths.moduleRel(m.name);
    if (!git.isRepo(m.dir)) {
      fail(`${rel} is missing. Run \`contextkit install\`.`);
      continue;
    }
    if (!fs.existsSync(path.join(m.dir, 'module.json'))) warn(`${rel} has no module.json (not a contextkit module?)`);
    const head = git.head(m.dir);
    if (m.spec.commit && head !== m.spec.commit) warn(`${rel} is at ${head.slice(0, 7)}, manifest pins ${m.spec.commit.slice(0, 7)}`);
    else ok(`${rel} @ ${head.slice(0, 7)}`);
    if (!git.pushDisabled(m.dir)) warn(`${rel}: push is not disabled on the managed clone; run \`contextkit install\` to harden it`);
    const branch = git.currentBranch(m.dir);
    if (branch) warn(`${rel}: HEAD is on branch "${branch}" (managed clones should be detached); run \`contextkit install\``);
    present.push(m);
  }

  // .gitignore
  const gi = path.join(root, '.gitignore');
  const giText = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  if (!/^\/?\.contextkit\/?\s*$/m.test(giText)) warn(`.gitignore does not list ${paths.KIT_DIR}/`);
  else ok(`.gitignore lists ${paths.KIT_DIR}/`);

  // Tool links
  for (const [link, target] of links.TOOL_LINKS) {
    const abs = path.join(root, link);
    const st = fs.lstatSync(abs, { throwIfNoEntry: false });
    if (!st) { fail(`${link} missing`); continue; }
    if (!st.isSymbolicLink()) { fail(`${link} is not a symlink (plain ${st.isDirectory() ? 'directory' : 'file'}). If checked out with core.symlinks=false, fix git config and re-checkout.`); continue; }
    const want = toPosix(path.relative(path.dirname(abs), path.join(root, target)));
    const got = toPosix(fs.readlinkSync(abs));
    if (got !== want) { fail(`${link} -> ${got}, expected ${want}${path.isAbsolute(got) ? ' (absolute target: junction or machine-specific link)' : ''}`); continue; }
    if (!fs.existsSync(abs)) { fail(`${link} -> ${got} does not resolve`); continue; }
    if (inGit) {
      if (git.isIgnored(root, link)) fail(`${link} is gitignored; Claude Code skips ignored skill dirs`);
      const mode = git.trackedMode(root, link);
      if (mode === null) warn(`${link} is not committed yet`);
      else if (mode !== '120000') fail(`${link} is tracked as mode ${mode}, expected 120000 (symlink)`);
    }
    ok(`${link} -> ${got}`);
  }

  // Items
  let desired;
  try {
    desired = links.desiredItems(present);
  } catch (err) {
    fail(err.message);
    return finish(checks);
  }
  const base = paths.agentsDir(root);
  let wired = 0;
  for (const [key, item] of desired) {
    const dest = path.join(base, key);
    const st = fs.lstatSync(dest, { throwIfNoEntry: false });
    if (!st) { fail(`${key} (from ${item.module}) is not wired into .agents/`); continue; }
    if (manifest.mode === 'copy') {
      if (!Object.hasOwn(manifest.copies || {}, key)) { fail(`${key} exists but is not recorded as a contextkit copy`); continue; }
      if (links.hashPath(dest) !== manifest.copies[key]) warn(`${key} copy differs from the recorded hash (locally modified?)`);
      wired += 1;
      continue;
    }
    if (!st.isSymbolicLink()) { fail(`${key} is project-owned but module "${item.module}" provides it (collision)`); continue; }
    const want = toPosix(path.relative(path.dirname(dest), item.targetAbs));
    const got = toPosix(fs.readlinkSync(dest));
    if (got !== want) { fail(`${key} -> ${got}, expected ${want}`); continue; }
    if (!fs.existsSync(dest)) { fail(`${key} -> ${got} dangles (missing clone?)`); continue; }
    if (inGit) {
      const rel = `.agents/${key}`;
      const mode = git.trackedMode(root, rel);
      if (mode === '120000') { /* committed as a symlink */ } else if (mode !== null) {
        warn(`${rel} is tracked as mode ${mode}; commit to replace it with the link`);
      } else if (git.tracksChildren(root, rel)) {
        warn(`${rel}: git still tracks old files at this path; commit to replace them with the link`);
      } else {
        warn(`${rel} link is not committed yet`);
      }
    }
    wired += 1;
  }
  if (wired) ok(`${wired}/${desired.size} kit item(s) wired`);
  // Stale kit links
  for (const sub of ['skills', 'personas']) {
    const dir = path.join(base, sub);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const key = `${sub}/${name}`;
      if (links.isKitLink(path.join(dir, name)) && !desired.has(key)) fail(`${key} is a stale contextkit link (no module provides it). Run \`contextkit install\`.`);
    }
  }

  // AGENTS.md / CLAUDE.md
  const agentsFile = path.join(root, 'AGENTS.md');
  if (agentsmd.hasBlock(root)) {
    ok('AGENTS.md has the managed contextkit block');
    const text = fs.readFileSync(agentsFile, 'utf8');
    for (const s of agentsmd.findLegacySections(text)) {
      warn(`AGENTS.md: legacy "${s.heading}" section duplicates the managed block; run \`contextkit install\` to merge`);
    }
    for (const target of agentsmd.deadLinks(root, text)) {
      warn(`AGENTS.md links to a path that does not exist: ${target}`);
    }
  } else {
    fail('AGENTS.md is missing the managed contextkit block. Run `contextkit install`.');
  }
  if (fs.existsSync(path.join(root, 'CLAUDE.md'))) ok('CLAUDE.md present');
  else warn('CLAUDE.md missing (Claude Code will not load AGENTS.md)');

  // Platform hint
  if (process.platform === 'win32' || /^\/mnt\/[a-z]\//.test(toPosix(root))) {
    warn('Windows-hosted checkout: confirm links are readable from Windows — powershell.exe -NoProfile -Command "Get-ChildItem \'.claude\\skills\'"');
  }
  return finish(checks);
}

function finish(checks) {
  return { ok: !checks.some((c) => c.level === 'fail'), checks };
}

module.exports = { run };
