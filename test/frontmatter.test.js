'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('../cli/lib/frontmatter');

test('parses folded scalars, booleans, flow and block lists', () => {
  const { data, body } = parse(`---
name: my-skill
description: >-
  Line one
  line two.
disable-model-invocation: true
tags: [a, "b", 'c']
tools:
  - Read
  - Grep
quoted: "hello: world"
---

# Body
`);
  assert.equal(data.name, 'my-skill');
  assert.equal(data.description, 'Line one line two.');
  assert.equal(data['disable-model-invocation'], true);
  assert.deepEqual(data.tags, ['a', 'b', 'c']);
  assert.deepEqual(data.tools, ['Read', 'Grep']);
  assert.equal(data.quoted, 'hello: world');
  assert.match(body, /# Body/);
});

test('literal block keeps newlines; no frontmatter returns null data', () => {
  const { data } = parse('---\ntext: |\n  a\n  b\n---\n');
  assert.equal(data.text, 'a\nb');
  assert.equal(parse('# no fm\n').data, null);
});
