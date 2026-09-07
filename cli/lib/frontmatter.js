'use strict';

/**
 * Minimal YAML frontmatter reader for SKILL.md / persona / knowledge files.
 * Supports: `key: value`, quoted strings, booleans, `[a, b]` flow lists,
 * `- item` block lists, and `>`, `>-`, `|`, `|-` block scalars.
 * Returns { data, body, raw } or { data: null } when no frontmatter.
 */
function parse(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: null, body: text, raw: null };
  const lines = m[1].split(/\r?\n/);
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i += 1; continue; }
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) { i += 1; continue; } // tolerate junk
    const key = kv[1];
    let val = kv[2].trim();
    i += 1;
    if (/^[>|]-?$/.test(val)) {
      const fold = val.startsWith('>');
      const chomp = val.endsWith('-');
      const block = [];
      while (i < lines.length && (/^\s+/.test(lines[i]) || lines[i].trim() === '')) {
        block.push(lines[i].replace(/^\s+/, ''));
        i += 1;
      }
      while (block.length && block[block.length - 1] === '') block.pop();
      let s = fold ? block.join(' ').replace(/\s+/g, ' ') : block.join('\n');
      if (!chomp) s += '\n';
      data[key] = s.trim();
      continue;
    }
    if (val === '') {
      const list = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        list.push(scalar(lines[i].replace(/^\s*-\s+/, '')));
        i += 1;
      }
      data[key] = list.length ? list : '';
      continue;
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = val.slice(1, -1).split(',').map((s) => scalar(s.trim())).filter((s) => s !== '');
      continue;
    }
    data[key] = scalar(val);
  }
  return { data, body: m[2], raw: m[1] };
}

function scalar(s) {
  if (/^(['"]).*\1$/.test(s)) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

module.exports = { parse };
