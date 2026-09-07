'use strict';

const fs = require('node:fs');
const path = require('node:path');
const log = require('../lib/log');
const git = require('../lib/git');
const { CLI_ROOT } = require('../lib/paths');

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

module.exports = {
  summary: 'Scaffold a new sub-module repository from templates/module',
  usage: 'new-module <name> [--dir <path>] [--description "<text>"] [--no-commit]',
  run({ positionals, flags, cwd }) {
    const name = positionals[0];
    if (!name || !KEBAB.test(name)) throw new Error('usage: contextkit new-module <kebab-case-name> [--dir <path>]');
    if (name === 'central') throw new Error('"central" is reserved');
    const dest = path.resolve(cwd, flags.dir || `contextkit-${name}`);
    if (fs.existsSync(dest) && fs.readdirSync(dest).length) throw new Error(`${dest} exists and is not empty`);
    const description = flags.description || `contextkit module: ${name}`;
    const src = path.join(CLI_ROOT, 'templates', 'module');
    fs.mkdirSync(dest, { recursive: true });
    copyTree(src, dest, (text) => text.replaceAll('{{MODULE_NAME}}', name).replaceAll('{{MODULE_DESCRIPTION}}', description));
    // Dogfood: tool links so the module repo itself has Layer 1 discovery.
    for (const [link, target] of [['.claude/skills', 'skills'], ['.claude/agents', 'personas'], ['.cursor/skills', 'skills'], ['.cursor/agents', 'personas']]) {
      fs.mkdirSync(path.join(dest, path.dirname(link)), { recursive: true });
      try { fs.symlinkSync(`../${target}`, path.join(dest, link), 'dir'); } catch (err) { if (err.code !== 'EPERM') throw err; log.warn(`could not create ${link} (EPERM); create it after enabling Developer Mode`); }
    }
    fs.writeFileSync(path.join(dest, 'AGENTS.md'), agentsMd(name, description));
    fs.writeFileSync(path.join(dest, 'CLAUDE.md'), '# CLAUDE.md\n\nThis project keeps its agent guidance in the vendor-neutral `AGENTS.md`:\n\n@AGENTS.md\n\nDo not duplicate guidance here — edit `AGENTS.md` instead.\n');
    log.ok(`scaffolded ${dest}`);
    if (!flags['no-commit']) {
      git.git(['init', '-q', '-b', 'main'], { cwd: dest });
      git.git(['add', '-A'], { cwd: dest });
      git.git(['commit', '-q', '-m', `Scaffold contextkit module ${name}`], { cwd: dest });
      log.ok(`initialised git repository with first commit`);
    }
    log.info(`next: add content under skills/, personas/, rules/, knowledge/; run \`contextkit validate ${dest}\`; push and register in central modules.json`);
    return 0;
  },
};

function copyTree(src, dest, transform) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyTree(s, d, transform);
    } else {
      const text = fs.readFileSync(s, 'utf8');
      fs.writeFileSync(d, transform(text));
    }
  }
}

function agentsMd(name, description) {
  return `# AGENTS.md

Canonical, vendor-neutral guidance for AI agents working in this repository.

## What this repository is

\`contextkit-${name}\` is a **contextkit sub-module**: ${description}

Everything under \`skills/\`, \`personas/\`, \`rules/\`, and \`knowledge/\` ships to
every repository that installs this module, so write it for a reader in a repo
you have never seen. Names must not collide with the central module.

## Layout

| Path | Role |
| --- | --- |
| \`module.json\` | module identity and version |
| \`skills/<name>/SKILL.md\` | Layer 1 skills; dir name == frontmatter \`name\` |
| \`personas/<name>.md\` | subagent-compatible personas |
| \`rules/*.md\` | always-on guidance |
| \`knowledge/<topic>/*.md\` | verified facts and decisions |
| \`.claude/*\`, \`.cursor/*\` | symlinks into \`skills/\` and \`personas/\` for local discovery |

Run \`npx github:VictorYan1990/contextkit validate .\` before committing.

## Session start: Layer 1 skill check

On your first substantive reply of a session only, check whether the skills in
\`skills/\` appear in the available-skills list you were given at startup, and
report one line: \`Layer 1 skill discovery: OK (N project skills).\` or the
missing names with the likely broken \`.claude/skills\` link. Slash-only skills
(\`disable-model-invocation: true\`) count as present.
`;
}
