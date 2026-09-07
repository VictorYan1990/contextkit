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

/** Create AGENTS.md from template, or insert/replace the managed block. */
function upsertBlock(root, block) {
  const file = path.join(root, 'AGENTS.md');
  if (!fs.existsSync(file)) {
    const tpl = read(path.join(templatesDir(root), 'AGENTS.md'));
    const text = tpl.replace('{{PROJECT_NAME}}', path.basename(root)).replace('{{CONTEXTKIT_BLOCK}}', block);
    fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
    return 'created';
  }
  const text = read(file);
  const range = findBlock(text);
  if (range) {
    const next = text.slice(0, range.start) + block + text.slice(range.end);
    if (next !== text) fs.writeFileSync(file, next);
    return next === text ? 'unchanged' : 'updated';
  }
  fs.writeFileSync(file, `${text.replace(/\s*$/, '')}\n\n${block}\n`);
  return 'appended';
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

module.exports = { BEGIN, END, templatesDir, renderBlock, upsertBlock, removeBlock, hasBlock, ensureClaudeMd, ensureGitignore };
