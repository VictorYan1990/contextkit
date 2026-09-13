'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { kitDir, CLI_ROOT, moduleRel } = require('./paths');

const BEGIN = '<!-- contextkit:begin';
const END = '<!-- contextkit:end -->';

/** Consumer templates from the installed kit when available, else the CLI's own. */
function templatesDir(root) {
  const inKit = path.join(kitDir(root), 'templates', 'consumer');
  return fs.existsSync(path.join(inKit, 'AGENTS.section.md')) ? inKit : path.join(CLI_ROOT, 'templates', 'consumer');
}

const read = (file) => fs.readFileSync(file, 'utf8');

/**
 * Render the managed block. `mods` is an ordered array of
 * { name, version, commit, rules: [{name}], knowledge: [{topic,count}] }.
 */
function renderBlock(root, mods) {
  const tpl = read(path.join(templatesDir(root), 'AGENTS.section.md'));
  const rules = [];
  const knowledge = [];
  const names = [];
  for (const m of mods) {
    const rel = moduleRel(m.name);
    for (const r of m.rules) rules.push(`- \`${rel}/rules/${r.name}\``);
    if (m.knowledge.length) {
      const topics = m.knowledge.map((k) => `${k.topic} (${k.count})`).join(', ');
      knowledge.push(`- \`${rel}/knowledge/\` — topics: ${topics}`);
    }
    const ver = m.version ? `@${m.version}` : '';
    const sha = m.commit ? ` (${m.commit.slice(0, 7)})` : '';
    names.push(`\`${m.name}${ver}\`${sha}`);
  }
  return tpl
    .replace('{{RULES_LIST}}', rules.length ? rules.join('\n') : '- (no rules installed)')
    .replace('{{KNOWLEDGE_LIST}}', knowledge.length ? knowledge.join('\n') : '- (no knowledge installed)')
    .replace('{{MODULES_LIST}}', names.join(', '))
    .trimEnd();
}

function findBlock(text) {
  const start = text.indexOf(BEGIN);
  if (start === -1) return null;
  const endIdx = text.indexOf(END, start);
  if (endIdx === -1) return null;
  return { start, end: endIdx + END.length };
}

/**
 * Hand-written sections that the managed block supersedes. These are the
 * headings the former `ai-layout-scaffold` skill produced before contextkit existed.
 */
const LEGACY_HEADINGS = [
  /^## Agent config layout\s*$/,
  /^## Session start: Layer 1 skill check\s*$/,
];

/**
 * Level-2 sections outside the managed block whose heading matches a legacy
 * pattern. Each entry is { start, end, heading } with character offsets; a
 * section runs to the next level-2 heading, the managed block, or EOF.
 */
function findLegacySections(text) {
  const block = findBlock(text);
  const lines = text.split('\n');
  const starts = [];
  let offset = 0;
  for (const l of lines) {
    starts.push(offset);
    offset += l.length + 1;
  }
  const sections = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('## ')) continue;
    const pos = starts[i];
    if (block && pos >= block.start && pos < block.end) continue;
    if (!LEGACY_HEADINGS.some((re) => re.test(line))) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith('## ') && !lines[j].startsWith(BEGIN)) j += 1;
    sections.push({ start: pos, end: j < lines.length ? starts[j] : text.length, heading: line.trim() });
  }
  return sections;
}

/** Relative links `](path)` outside the managed block whose target does not exist. */
function deadLinks(root, text) {
  const block = findBlock(text);
  const out = [];
  const re = /\]\(([^)\s#]+)(?:#[^)]*)?\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (block && m.index >= block.start && m.index < block.end) continue;
    const target = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('/')) continue;
    if (!fs.existsSync(path.join(root, target))) out.push(target);
  }
  return [...new Set(out)];
}

/**
 * Create AGENTS.md from template, or insert/replace the managed block.
 * Legacy scaffold sections are removed and the block takes the first one's
 * place, so the file keeps its structure. Returns { status, removed }.
 */
function upsertBlock(root, block) {
  const file = path.join(root, 'AGENTS.md');
  if (!fs.existsSync(file)) {
    const tpl = read(path.join(templatesDir(root), 'AGENTS.md'));
    const text = tpl.replace('{{PROJECT_NAME}}', path.basename(root)).replace('{{CONTEXTKIT_BLOCK}}', block);
    fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
    return { status: 'created', removed: [] };
  }
  const original = read(file);
  const legacy = findLegacySections(original);
  let text = original;
  for (const s of [...legacy].reverse()) text = text.slice(0, s.start) + text.slice(s.end);
  const insertAt = legacy.length ? legacy[0].start : null;
  const removed = legacy.map((s) => s.heading);

  const range = findBlock(text);
  let next;
  if (range) {
    next = text.slice(0, range.start) + block + text.slice(range.end);
  } else if (insertAt !== null) {
    const before = text.slice(0, insertAt).replace(/\s*$/, '');
    const after = text.slice(insertAt).replace(/^\s*/, '');
    next = `${before ? `${before}\n\n` : ''}${block}\n${after ? `\n${after}` : ''}`;
  } else {
    next = `${text.replace(/\s*$/, '')}\n\n${block}\n`;
  }
  next = next.replace(/\n{3,}/g, '\n\n');
  if (!next.endsWith('\n')) next += '\n';
  if (next === original) return { status: 'unchanged', removed: [] };
  fs.writeFileSync(file, next);
  let status;
  if (removed.length) status = 'merged';
  else if (range) status = 'updated';
  else status = 'appended';
  return { status, removed };
}

function removeBlock(root) {
  const file = path.join(root, 'AGENTS.md');
  if (!fs.existsSync(file)) return 'absent';
  const text = read(file);
  const range = findBlock(text);
  if (!range) return 'absent';
  const next = `${(text.slice(0, range.start) + text.slice(range.end)).replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '')}\n`;
  fs.writeFileSync(file, next);
  return 'removed';
}

function hasBlock(root) {
  const file = path.join(root, 'AGENTS.md');
  return fs.existsSync(file) && findBlock(read(file)) !== null;
}

function ensureClaudeMd(root) {
  const file = path.join(root, 'CLAUDE.md');
  if (fs.existsSync(file)) return 'exists';
  fs.writeFileSync(file, read(path.join(templatesDir(root), 'CLAUDE.md')));
  return 'created';
}

function ensureGitignore(root, entry) {
  const file = path.join(root, '.gitignore');
  const text = fs.existsSync(file) ? read(file) : '';
  const bare = entry.replace(/\/$/, '');
  const present = text.split(/\r?\n/).some((l) => {
    const t = l.trim();
    return t === entry || t === bare || t === `/${entry}` || t === `/${bare}`;
  });
  if (present) return 'exists';
  const sep = text.length && !text.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(file, `${text}${sep}${text.length ? '\n' : ''}# contextkit: managed clone, restored by \`npx contextkit install\`\n${entry}\n`);
  return 'added';
}

module.exports = {
  BEGIN, END, templatesDir, renderBlock, findBlock, findLegacySections, deadLinks, upsertBlock, removeBlock, hasBlock,
  ensureClaudeMd, ensureGitignore,
};
