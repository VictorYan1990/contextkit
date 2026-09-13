'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp } = require('./helpers');
const agentsmd = require('../cli/lib/agentsmd');

const mods = [{ name: 'central', version: '0.1.0', commit: 'abcdef0123', rules: [{ name: 'SOUL.md' }], knowledge: [{ topic: 'ai-tooling', count: 1 }] }];
const readAgents = (root) => fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
const count = (text, re) => (text.match(re) || []).length;

test('creates AGENTS.md from template, then replaces the block idempotently', () => {
  const root = mkTmp('agents');
  const block = agentsmd.renderBlock(root, mods);
  assert.match(block, /\.contextkit\/rules\/SOUL\.md/);
  assert.match(block, /ai-tooling \(1\)/);
  assert.equal(agentsmd.upsertBlock(root, block).status, 'created');
  assert.match(readAgents(root), new RegExp(path.basename(root)));
  assert.equal(agentsmd.upsertBlock(root, block).status, 'unchanged');
  const block2 = agentsmd.renderBlock(root, [{ ...mods[0], commit: '9999999999' }]);
  assert.equal(agentsmd.upsertBlock(root, block2).status, 'updated');
  const after = readAgents(root);
  assert.equal(count(after, /contextkit:begin/g), 1);
  assert.match(after, /9999999/);
  assert.doesNotMatch(after, /abcdef0/);
});

test('appends to an existing AGENTS.md and removes cleanly', () => {
  const root = mkTmp('agents2');
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Mine\n\nKeep this.\n');
  assert.equal(agentsmd.upsertBlock(root, agentsmd.renderBlock(root, mods)).status, 'appended');
  assert.equal(agentsmd.hasBlock(root), true);
  assert.equal(agentsmd.removeBlock(root), 'removed');
  assert.equal(readAgents(root), '# Mine\n\nKeep this.\n');
});

const LEGACY = `# AGENTS.md

## Project overview

My project. Keep.

## Agent config layout

\`.agents/\` is the single source of truth. Old table here.

### Sub-heading inside the legacy section

Still legacy.

## Personas

- [\`reviewer.md\`](.agents/personas/reviewer.md)

## Session start: Layer 1 skill check

Old self-check text.
`;

test('merges: legacy scaffold sections are replaced by the block at the first one\'s position', () => {
  const root = mkTmp('legacy');
  fs.writeFileSync(path.join(root, 'AGENTS.md'), LEGACY);
  const r = agentsmd.upsertBlock(root, agentsmd.renderBlock(root, mods));
  assert.equal(r.status, 'merged');
  assert.deepEqual(r.removed, ['## Agent config layout', '## Session start: Layer 1 skill check']);
  const text = readAgents(root);
  assert.equal(count(text, /^## Agent config layout/gm), 1, 'only the managed heading remains');
  assert.equal(count(text, /Session start: Layer 1 skill check/g), 1);
  assert.doesNotMatch(text, /Old table here|Still legacy|Old self-check/);
  assert.match(text, /## Project overview\n\nMy project\. Keep\.\n\n<!-- contextkit:begin/, 'block sits where the legacy section was');
  assert.match(text, /contextkit:end -->\n\n## Personas/, 'later user sections follow the block');
  assert.equal(agentsmd.findLegacySections(text).length, 0);
  assert.equal(agentsmd.upsertBlock(root, agentsmd.renderBlock(root, mods)).status, 'unchanged');
});

test('merges when the block already exists next to legacy sections (post-append cleanup)', () => {
  const root = mkTmp('legacy2');
  const block = agentsmd.renderBlock(root, mods);
  fs.writeFileSync(path.join(root, 'AGENTS.md'), `${LEGACY}\n${block}\n`);
  assert.equal(agentsmd.findLegacySections(readAgents(root)).length, 2);
  const r = agentsmd.upsertBlock(root, block);
  assert.equal(r.status, 'merged');
  const text = readAgents(root);
  assert.equal(count(text, /contextkit:begin/g), 1);
  assert.equal(count(text, /^## Agent config layout/gm), 1);
  assert.match(text, /## Personas/);
});

test('deadLinks reports missing relative targets outside the block only', () => {
  const root = mkTmp('links');
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'docs/x.md'), 'x');
  const block = agentsmd.renderBlock(root, mods);
  const text = `# A\n\n[ok](docs/x.md) [gone](.agents/personas/agent-engineer.md) [web](https://example.com) [anchor](#top)\n\n${block}\n`;
  assert.deepEqual(agentsmd.deadLinks(root, text), ['.agents/personas/agent-engineer.md']);
});

test('gitignore entry is added once', () => {
  const root = mkTmp('gi');
  assert.equal(agentsmd.ensureGitignore(root, '.contextkit/'), 'added');
  assert.equal(agentsmd.ensureGitignore(root, '.contextkit/'), 'exists');
  fs.writeFileSync(path.join(root, '.gitignore'), '/.contextkit\n');
  assert.equal(agentsmd.ensureGitignore(root, '.contextkit/'), 'exists');
});
