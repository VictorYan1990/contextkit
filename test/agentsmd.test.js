'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp } = require('./helpers');
const agentsmd = require('../cli/lib/agentsmd');

const mods = [{ name: 'central', version: '0.1.0', commit: 'abcdef0123', rules: [{ name: 'SOUL.md' }], knowledge: [{ topic: 'ai-tooling', count: 1 }] }];

test('creates AGENTS.md from template, then replaces the block idempotently', () => {
  const root = mkTmp('agents');
  const block = agentsmd.renderBlock(root, mods);
  assert.match(block, /\.contextkit\/rules\/SOUL\.md/);
  assert.match(block, /ai-tooling \(1\)/);
  assert.equal(agentsmd.upsertBlock(root, block), 'created');
  const text = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.match(text, new RegExp(path.basename(root)));
  assert.equal(agentsmd.upsertBlock(root, block), 'unchanged');
  const block2 = agentsmd.renderBlock(root, [{ ...mods[0], commit: '9999999999' }]);
  assert.equal(agentsmd.upsertBlock(root, block2), 'updated');
  const after = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.equal((after.match(/contextkit:begin/g) || []).length, 1);
  assert.match(after, /9999999/);
  assert.doesNotMatch(after, /abcdef0/);
});

test('appends to an existing AGENTS.md and removes cleanly', () => {
  const root = mkTmp('agents2');
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Mine\n\nKeep this.\n');
  assert.equal(agentsmd.upsertBlock(root, agentsmd.renderBlock(root, mods)), 'appended');
  assert.equal(agentsmd.hasBlock(root), true);
  assert.equal(agentsmd.removeBlock(root), 'removed');
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), '# Mine\n\nKeep this.\n');
});

test('gitignore entry is added once', () => {
  const root = mkTmp('gi');
  assert.equal(agentsmd.ensureGitignore(root, '.contextkit/'), 'added');
  assert.equal(agentsmd.ensureGitignore(root, '.contextkit/'), 'exists');
  fs.writeFileSync(path.join(root, '.gitignore'), '/.contextkit\n');
  assert.equal(agentsmd.ensureGitignore(root, '.contextkit/'), 'exists');
});
