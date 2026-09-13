'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, write, skill, makeModule, makeConsumer, commitAll, ck, readlink, isLink, git } = require('./helpers');

function setup() {
  const base = mkTmp('e2e');
  const central = makeModule(path.join(base, 'central'), {
    name: 'central', kind: 'central', skills: ['alpha', 'beta'], personas: ['reviewer'], rules: ['SOUL'], knowledge: ['fact'],
    extraFiles: { 'modules.json': JSON.stringify({ modules: { extra: { source: path.join(base, 'extra'), ref: 'main', description: 'extra module' } } }) },
  });
  const extra = makeModule(path.join(base, 'extra'), { name: 'extra', skills: ['gamma'], rules: ['EXTRA'] });
  const consumer = makeConsumer(path.join(base, 'consumer'));
  return { base, central, extra, consumer };
}

test('init wires central, writes manifest, AGENTS.md, CLAUDE.md, .gitignore; doctor passes', () => {
  const { central, consumer } = setup();
  const r = ck(['init', '--source', central, '--ref', 'main'], consumer);
  assert.equal(r.code, 0, r.out);
  const manifest = JSON.parse(fs.readFileSync(path.join(consumer, 'contextkit.json'), 'utf8'));
  assert.equal(manifest.source, central);
  assert.equal(manifest.commit, git(['rev-parse', 'HEAD'], central));
  assert.equal(readlink(path.join(consumer, '.claude/skills')), '../.agents/skills');
  assert.equal(readlink(path.join(consumer, '.agents/skills/alpha')), '../../.contextkit/skills/alpha');
  assert.equal(readlink(path.join(consumer, '.agents/personas/reviewer.md')), '../../.contextkit/personas/reviewer.md');
  assert.ok(fs.existsSync(path.join(consumer, '.claude/skills/alpha/SKILL.md')), 'resolves through two links');
  const agents = fs.readFileSync(path.join(consumer, 'AGENTS.md'), 'utf8');
  assert.match(agents, /contextkit:begin/);
  assert.match(agents, /\.contextkit\/rules\/SOUL\.md/);
  assert.ok(fs.existsSync(path.join(consumer, 'CLAUDE.md')));
  assert.match(fs.readFileSync(path.join(consumer, '.gitignore'), 'utf8'), /^\.contextkit\/$/m);
  assert.match(r.out, /doctor: all checks passed/);
  // The managed clone is read-only in practice: no push URL, detached HEAD, no local branch.
  const kit = path.join(consumer, '.contextkit');
  assert.equal(git(['config', '--get', 'remote.origin.pushurl'], kit), 'NO_PUSH-contextkit-managed-clone-contribute-upstream-instead');
  assert.equal(git(['for-each-ref', 'refs/heads/'], kit), '', 'no local branches');
  assert.throws(() => git(['symbolic-ref', '--quiet', 'HEAD'], kit), 'HEAD is detached');
  fs.writeFileSync(path.join(kit, 'stray.md'), 'x');
  git(['add', 'stray.md'], kit);
  git(['commit', '-q', '-m', 'stray'], kit);
  assert.throws(() => git(['push', 'origin', 'HEAD:main'], kit), /does not appear to be a git repository/);
  assert.equal(git(['rev-parse', 'HEAD'], central) !== git(['rev-parse', 'HEAD'], kit), true, 'source untouched');
  // Re-running is idempotent.
  const again = ck(['init', '--source', central], consumer);
  assert.equal(again.code, 0, again.out);
  assert.match(again.out, /already exists; running install/);
});

test('add by registry name and by URL, remove, and stale-link cleanup', () => {
  const { central, extra, consumer } = setup();
  assert.equal(ck(['init', '--source', central, '--no-doctor'], consumer).code, 0);
  let r = ck(['add', 'extra'], consumer);
  assert.equal(r.code, 0, r.out);
  assert.equal(readlink(path.join(consumer, '.agents/skills/gamma')), '../../.contextkit/modules/extra/skills/gamma');
  assert.match(fs.readFileSync(path.join(consumer, 'AGENTS.md'), 'utf8'), /modules\/extra\/rules\/EXTRA\.md/);
  r = ck(['add', 'extra'], consumer);
  assert.equal(r.code, 1);
  assert.match(r.out, /already installed/);
  r = ck(['add', extra, '--name', 'extra2'], consumer);
  assert.equal(r.code, 1, 'same skill from two modules must collide');
  assert.match(r.out, /Both module "extra" and module "extra2" provide skills\/gamma/);
  assert.ok(!fs.existsSync(path.join(consumer, 'contextkit.json')) || !JSON.parse(fs.readFileSync(path.join(consumer, 'contextkit.json'), 'utf8')).modules.extra2, 'failed add is rolled back');
  r = ck(['remove', 'extra'], consumer);
  assert.equal(r.code, 0, r.out);
  assert.equal(isLink(path.join(consumer, '.agents/skills/gamma')), false);
  assert.ok(!fs.existsSync(path.join(consumer, '.contextkit/modules/extra')));
  assert.doesNotMatch(fs.readFileSync(path.join(consumer, 'AGENTS.md'), 'utf8'), /EXTRA\.md/);
  assert.equal(ck(['doctor'], consumer).code, 0);
});

test('update follows the ref, adds new links, removes dropped ones, keeps project items', () => {
  const { central, consumer } = setup();
  assert.equal(ck(['init', '--source', central, '--no-doctor'], consumer).code, 0);
  write(path.join(consumer, '.agents/skills/mine/SKILL.md'), skill('mine'));
  fs.rmSync(path.join(central, 'skills/beta'), { recursive: true });
  write(path.join(central, 'skills/delta/SKILL.md'), skill('delta'));
  const sha = commitAll(central, 'swap beta for delta');
  const r = ck(['update'], consumer);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /new items: skills\/delta/);
  assert.match(r.out, /removed items: skills\/beta/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(consumer, 'contextkit.json'), 'utf8')).commit, sha);
  assert.equal(isLink(path.join(consumer, '.agents/skills/beta')), false);
  assert.equal(readlink(path.join(consumer, '.agents/skills/delta')), '../../.contextkit/skills/delta');
  assert.ok(fs.existsSync(path.join(consumer, '.agents/skills/mine/SKILL.md')), 'project-owned skill untouched');
});

test('install restores a fresh clone at the pinned commit; doctor fails on a broken link', () => {
  const { central, consumer } = setup();
  assert.equal(ck(['init', '--source', central, '--no-doctor'], consumer).code, 0);
  const pinned = JSON.parse(fs.readFileSync(path.join(consumer, 'contextkit.json'), 'utf8')).commit;
  write(path.join(central, 'skills/zeta/SKILL.md'), skill('zeta'));
  commitAll(central, 'even later');
  // Simulate a fresh clone: .contextkit is gone, links dangle.
  fs.rmSync(path.join(consumer, '.contextkit'), { recursive: true });
  assert.equal(ck(['doctor'], consumer).code, 1);
  const r = ck(['install'], consumer);
  assert.equal(r.code, 0, r.out);
  assert.equal(git(['rev-parse', 'HEAD'], path.join(consumer, '.contextkit')), pinned, 'install checks out the pinned commit, not the tip');
  assert.equal(ck(['doctor'], consumer).code, 0);
  fs.unlinkSync(path.join(consumer, '.agents/skills/alpha'));
  const bad = ck(['doctor'], consumer);
  assert.equal(bad.code, 1);
  assert.match(bad.out, /skills\/alpha .*not wired/);
});

test('collision with a project-owned skill is refused', () => {
  const { central, consumer } = setup();
  write(path.join(consumer, '.agents/skills/alpha/SKILL.md'), skill('alpha'));
  const r = ck(['init', '--source', central], consumer);
  assert.equal(r.code, 1);
  assert.match(r.out, /skills\/alpha already exists .* project-owned/);
});

test('copy mode installs tracked copies and refuses to clobber local edits', () => {
  const { central, consumer } = setup();
  let r = ck(['init', '--source', central, '--mode', 'copy'], consumer);
  assert.equal(r.code, 0, r.out);
  const dest = path.join(consumer, '.agents/skills/alpha');
  assert.equal(isLink(dest), false);
  assert.ok(fs.existsSync(path.join(dest, 'SKILL.md')));
  const m = JSON.parse(fs.readFileSync(path.join(consumer, 'contextkit.json'), 'utf8'));
  assert.equal(m.mode, 'copy');
  assert.ok(m.copies['skills/alpha']);
  assert.match(r.out, /doctor: all checks passed/);
  fs.appendFileSync(path.join(dest, 'SKILL.md'), '\nlocal edit\n');
  write(path.join(central, 'skills/alpha/SKILL.md'), skill('alpha', 'paths: ["src/**"]\n'));
  commitAll(central, 'change alpha');
  r = ck(['update'], consumer);
  assert.equal(r.code, 1);
  assert.match(r.out, /modified locally/);
  r = ck(['update', '--force'], consumer);
  assert.equal(r.code, 0, r.out);
  assert.match(fs.readFileSync(path.join(dest, 'SKILL.md'), 'utf8'), /paths:/);
});

test('remove --all uninstalls but keeps tool links and project items', () => {
  const { central, consumer } = setup();
  assert.equal(ck(['init', '--source', central, '--no-doctor'], consumer).code, 0);
  write(path.join(consumer, '.agents/skills/mine/SKILL.md'), skill('mine'));
  const r = ck(['remove', '--all'], consumer);
  assert.equal(r.code, 0, r.out);
  assert.ok(!fs.existsSync(path.join(consumer, 'contextkit.json')));
  assert.ok(!fs.existsSync(path.join(consumer, '.contextkit')));
  assert.equal(isLink(path.join(consumer, '.agents/skills/alpha')), false);
  assert.ok(fs.existsSync(path.join(consumer, '.agents/skills/mine/SKILL.md')));
  assert.equal(readlink(path.join(consumer, '.claude/skills')), '../.agents/skills');
  assert.doesNotMatch(fs.readFileSync(path.join(consumer, 'AGENTS.md'), 'utf8'), /contextkit:begin/);
});

test('new-module scaffolds a valid module repo; validate catches contract violations', () => {
  const base = mkTmp('newmod');
  let r = ck(['new-module', 'python-dev', '--dir', path.join(base, 'pd'), '--description', 'Python tooling'], base);
  assert.equal(r.code, 0, r.out);
  const dir = path.join(base, 'pd');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'module.json'), 'utf8')).name, 'python-dev');
  assert.match(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'), /Python tooling/);
  assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD'], dir), 'main');
  assert.equal(readlink(path.join(dir, '.claude/skills')), '../skills');
  r = ck(['validate', dir], base);
  assert.equal(r.code, 0, r.out);
  r = ck(['doctor'], dir);
  assert.equal(r.code, 0, r.out);
  write(path.join(dir, 'skills/Bad_Name/SKILL.md'), skill('other-name'));
  r = ck(['validate', dir], base);
  assert.equal(r.code, 1);
  assert.match(r.out, /not kebab-case/);
  assert.match(r.out, /must equal directory name/);
});

test('list shows installed modules and the registry', () => {
  const { central, consumer } = setup();
  assert.equal(ck(['init', '--source', central, '--no-doctor', '--with', 'extra'], consumer).code, 0);
  let r = ck(['list', '--json'], consumer);
  assert.equal(r.code, 0, r.out);
  const rows = JSON.parse(r.out);
  assert.deepEqual(rows.map((x) => x.name), ['central', 'extra']);
  assert.equal(rows[0].latest, rows[0].commit);
  r = ck(['list', '--available'], consumer);
  assert.match(r.out, /extra module/);
});

test('migration: old tracked skill copies and legacy AGENTS.md sections are handled', () => {
  const { central, consumer } = setup();
  // The consumer already has hand-written scaffold sections and a committed local copy of a kit skill.
  write(path.join(consumer, 'AGENTS.md'), '# AGENTS.md\n\n## Project overview\n\nMine.\n\n## Agent config layout\n\nOld table.\n\n## Personas\n\n- [`gone.md`](.agents/personas/gone.md)\n\n## Session start: Layer 1 skill check\n\nOld check.\n');
  write(path.join(consumer, '.agents/skills/alpha/SKILL.md'), skill('alpha'));
  commitAll(consumer, 'scaffold');
  // Developer deletes the local copy from the working tree (not yet committed), then installs the kit.
  fs.rmSync(path.join(consumer, '.agents/skills/alpha'), { recursive: true });
  const r = ck(['init', '--source', central], consumer);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /replaced legacy section\(s\).*Agent config layout.*Session start/);
  assert.match(r.out, /\.agents\/skills\/alpha: git still tracks old files at this path/);
  assert.match(r.out, /\.agents\/skills\/beta link is not committed yet/);
  assert.match(r.out, /links to a path that does not exist: \.agents\/personas\/gone\.md/);
  const text = fs.readFileSync(path.join(consumer, 'AGENTS.md'), 'utf8');
  assert.equal((text.match(/^## Agent config layout/gm) || []).length, 1);
  assert.match(text, /## Project overview\n\nMine\.\n\n<!-- contextkit:begin/);
  assert.match(text, /## Personas/);
  // After committing, the tracking warnings disappear and doctor is clean of them.
  commitAll(consumer, 'adopt contextkit');
  const d = ck(['doctor'], consumer);
  assert.equal(d.code, 0, d.out);
  assert.doesNotMatch(d.out, /not committed|still tracks|legacy/);
  assert.match(d.out, /does not exist: \.agents\/personas\/gone\.md/, 'dead link is project content; still reported');
});
