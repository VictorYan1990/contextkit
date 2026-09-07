'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '..', 'cli', 'bin', 'contextkit.js');
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@example.com',
  GIT_CONFIG_GLOBAL: '/dev/null', NO_COLOR: '1',
};

function mkTmp(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `ck-${label}-`));
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: GIT_ENV, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function skill(name, extra = '') {
  return `---\nname: ${name}\ndescription: >-\n  Test skill ${name}. Use when testing the contextkit installer end to end.\n${extra}---\n\n# ${name}\n\nBody.\n`;
}

function persona(name) {
  return `---\nname: ${name}\ndescription: >-\n  Test persona ${name}. Use when a test needs a persona to be wired.\ntools: Read\n---\n\n# ${name}\n`;
}

/** Create a git repo that is a valid contextkit module. Returns its path. */
function makeModule(dir, { name, kind = 'module', skills = [], personas = [], rules = [], knowledge = [], extraFiles = {} }) {
  write(path.join(dir, 'module.json'), JSON.stringify({ name, kind, version: '0.1.0', description: `Test module ${name}`, requires: { contextkit: '>=0.1.0' } }, null, 2));
  for (const s of skills) write(path.join(dir, 'skills', s, 'SKILL.md'), skill(s));
  for (const p of personas) write(path.join(dir, 'personas', `${p}.md`), persona(p));
  for (const r of rules) write(path.join(dir, 'rules', `${r}.md`), `# ${r}\n\nAlways do the thing.\n`);
  for (const k of knowledge) write(path.join(dir, 'knowledge', 'topic', `${k}.md`), `---\ntitle: ${k}\ndate: 2026-01-01\nstatus: verified\ntags: [topic]\n---\n\n# ${k}\n`);
  for (const [rel, text] of Object.entries(extraFiles)) write(path.join(dir, rel), text);
  git(['init', '-q', '-b', 'main'], dir);
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', 'init'], dir);
  return dir;
}

function commitAll(dir, msg) {
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', msg], dir);
  return git(['rev-parse', 'HEAD'], dir);
}

function makeConsumer(dir) {
  write(path.join(dir, 'README.md'), '# consumer\n');
  git(['init', '-q', '-b', 'main'], dir);
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', 'init'], dir);
  return dir;
}

/** Run the CLI; returns { code, out } with stdout+stderr merged. */
function ck(args, cwd) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: GIT_ENV });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const readlink = (p) => fs.readlinkSync(p).split(path.sep).join('/');
const isLink = (p) => Boolean(fs.lstatSync(p, { throwIfNoEntry: false })?.isSymbolicLink());

module.exports = { mkTmp, git, write, skill, persona, makeModule, makeConsumer, commitAll, ck, readlink, isLink, CLI };
