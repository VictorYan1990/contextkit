'use strict';

const fs = require('node:fs');
const path = require('node:path');
const fm = require('./frontmatter');
const mod = require('./module');

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const SKILL_FIELDS = new Set(['name', 'description', 'disable-model-invocation', 'paths', 'metadata', 'license', 'compatibility']);
const PERSONA_FIELDS = new Set(['name', 'description', 'tools', 'model', 'metadata']);
const KNOWLEDGE_STATUS = new Set(['verified', 'decision', 'hypothesis']);

/**
 * Validate a module directory. Returns { errors: [], warnings: [], summary }.
 */
function validate(dir) {
  const errors = [];
  const warnings = [];
  const err = (f, m) => errors.push(`${f}: ${m}`);
  const warn = (f, m) => warnings.push(`${f}: ${m}`);
  const rel = (p) => path.relative(dir, p) || '.';

  // module.json
  let manifest = null;
  try {
    manifest = mod.readModuleJson(dir);
  } catch (e) {
    err('module.json', e.message);
  }
  if (!manifest) {
    if (!errors.length) err('module.json', 'missing');
  } else {
    if (!manifest.name || !KEBAB.test(manifest.name)) err('module.json', `name must be kebab-case, got ${JSON.stringify(manifest.name)}`);
    if (!['central', 'module'].includes(manifest.kind)) err('module.json', `kind must be "central" or "module", got ${JSON.stringify(manifest.kind)}`);
    if (!manifest.version || !SEMVER.test(manifest.version)) err('module.json', `version must be semver, got ${JSON.stringify(manifest.version)}`);
    if (!manifest.description || !String(manifest.description).trim()) err('module.json', 'description is required');
    if (!manifest.requires || typeof manifest.requires.contextkit !== 'string') warn('module.json', 'requires.contextkit range is missing');
  }

  // skills
  const skillsDir = path.join(dir, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const e of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const file = path.join(skillsDir, e.name, 'SKILL.md');
      const label = rel(file);
      if (!fs.existsSync(file)) { err(rel(path.join(skillsDir, e.name)), 'directory without SKILL.md'); continue; }
      if (!KEBAB.test(e.name)) err(label, `skill directory "${e.name}" is not kebab-case`);
      const { data } = fm.parse(fs.readFileSync(file, 'utf8'));
      if (!data) { err(label, 'missing frontmatter'); continue; }
      if (data.name !== e.name) err(label, `frontmatter name ${JSON.stringify(data.name)} must equal directory name "${e.name}"`);
      if (!data.description || String(data.description).length < 20) err(label, 'description missing or too short (say when to use the skill)');
      if (String(data.description || '').length > 1024) warn(label, 'description over 1024 chars; some tools truncate');
      if ('disable-model-invocation' in data && typeof data['disable-model-invocation'] !== 'boolean') err(label, 'disable-model-invocation must be true or false');
      for (const k of Object.keys(data)) if (!SKILL_FIELDS.has(k)) warn(label, `frontmatter field "${k}" is not portable across tools`);
      const lines = fs.readFileSync(file, 'utf8').split('\n').length;
      if (lines > 300) warn(label, `${lines} lines; consider moving reference material to sibling files`);
    }
  }

  // personas
  for (const p of mod.listPersonas(dir)) {
    const label = rel(p.path);
    if (!KEBAB.test(p.name)) err(label, `persona file name "${p.name}" is not kebab-case`);
    const { data } = fm.parse(fs.readFileSync(p.path, 'utf8'));
    if (!data) { err(label, 'missing frontmatter'); continue; }
    if (data.name !== p.name) err(label, `frontmatter name ${JSON.stringify(data.name)} must equal file name "${p.name}"`);
    if (!data.description || String(data.description).length < 20) err(label, 'description missing or too short (say when to use the persona)');
    for (const k of Object.keys(data)) if (!PERSONA_FIELDS.has(k)) warn(label, `frontmatter field "${k}" is not portable across tools`);
  }

  // rules
  const rulesDir = path.join(dir, 'rules');
  if (fs.existsSync(rulesDir)) {
    for (const e of fs.readdirSync(rulesDir, { withFileTypes: true })) {
      if (e.isDirectory()) warn(rel(path.join(rulesDir, e.name)), 'rules/ should be flat');
      else if (!e.name.endsWith('.md')) warn(rel(path.join(rulesDir, e.name)), 'non-markdown file in rules/');
    }
    if (manifest && manifest.kind === 'central' && fs.existsSync(path.join(rulesDir, 'USER.md'))) {
      err('rules/USER.md', 'a real user profile must not live in the central module (use a private module)');
    }
  }

  // knowledge
  for (const file of mod.listKnowledgeFiles(dir)) {
    const label = rel(file);
    const { data } = fm.parse(fs.readFileSync(file, 'utf8'));
    if (!data) { err(label, 'missing frontmatter'); continue; }
    if (!data.title) err(label, 'title is required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date || ''))) err(label, `date must be YYYY-MM-DD, got ${JSON.stringify(data.date)}`);
    if (!KNOWLEDGE_STATUS.has(data.status)) err(label, `status must be one of ${[...KNOWLEDGE_STATUS].join('|')}, got ${JSON.stringify(data.status)}`);
    if (!Array.isArray(data.tags) || !data.tags.length) warn(label, 'tags should be a non-empty list');
    if (path.dirname(file) === path.join(dir, 'knowledge')) warn(label, 'knowledge entries belong in a topic sub-directory');
  }

  // Tool links in a module checkout (optional but must be right if present)
  for (const [link, target] of [['.claude/skills', 'skills'], ['.claude/agents', 'personas'], ['.cursor/skills', 'skills'], ['.cursor/agents', 'personas']]) {
    const abs = path.join(dir, link);
    const st = fs.lstatSync(abs, { throwIfNoEntry: false });
    if (!st) continue;
    if (!st.isSymbolicLink()) { err(link, 'exists but is not a symlink'); continue; }
    const got = fs.readlinkSync(abs).split(path.sep).join('/');
    if (got !== `../${target}`) err(link, `-> ${got}, expected ../${target}`);
  }

  const inv = mod.inventory(dir);
  const summary = `${inv.skills.length} skill(s), ${inv.personas.length} persona(s), ${inv.rules.length} rule(s), ${inv.knowledge.reduce((n, k) => n + k.count, 0)} knowledge entr(ies)`;
  return { errors, warnings, summary, name: manifest?.name };
}

module.exports = { validate };
