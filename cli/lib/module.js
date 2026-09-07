'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SKIP_MD = new Set(['README.md']);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`${file}: ${err.message}`);
  }
}

const readModuleJson = (dir) => readJson(path.join(dir, 'module.json'));

function listDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/** Skills: sub-directories of `skills/` that contain a SKILL.md. */
function listSkills(dir) {
  const base = path.join(dir, 'skills');
  return listDir(base)
    .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && fs.existsSync(path.join(base, e.name, 'SKILL.md')))
    .map((e) => ({ name: e.name, path: path.join(base, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Personas: `personas/*.md` except README. */
function listPersonas(dir) {
  const base = path.join(dir, 'personas');
  return listDir(base)
    .filter((e) => !e.isDirectory() && e.name.endsWith('.md') && !SKIP_MD.has(e.name))
    .map((e) => ({ name: e.name.replace(/\.md$/, ''), file: e.name, path: path.join(base, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Rules: `rules/*.md` except README and `*.template.md`. */
function listRules(dir) {
  const base = path.join(dir, 'rules');
  return listDir(base)
    .filter((e) => !e.isDirectory() && e.name.endsWith('.md') && !SKIP_MD.has(e.name) && !/\.template\.md$/.test(e.name))
    .map((e) => ({ name: e.name, path: path.join(base, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Knowledge topics: sub-directories of `knowledge/` with their entry count. */
function listKnowledge(dir) {
  const base = path.join(dir, 'knowledge');
  return listDir(base)
    .filter((e) => e.isDirectory())
    .map((e) => ({
      topic: e.name,
      count: listDir(path.join(base, e.name)).filter((f) => f.name.endsWith('.md')).length,
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

/** Knowledge entries (files) for validation. */
function listKnowledgeFiles(dir) {
  const base = path.join(dir, 'knowledge');
  const out = [];
  const walk = (d) => {
    for (const e of listDir(d)) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md') && !SKIP_MD.has(e.name) && !e.name.startsWith('_')) out.push(p);
    }
  };
  walk(base);
  return out.sort();
}

function inventory(dir) {
  return {
    manifest: readModuleJson(dir),
    skills: listSkills(dir),
    personas: listPersonas(dir),
    rules: listRules(dir),
    knowledge: listKnowledge(dir),
  };
}

module.exports = {
  readJson, readModuleJson, listSkills, listPersonas, listRules, listKnowledge, listKnowledgeFiles, inventory,
};
