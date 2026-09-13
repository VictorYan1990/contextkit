# AGENTS.md

Canonical, vendor-neutral guidance for AI agents working **in this repository**.
Tool-specific files re-export this one — edit here, not there.

## What this repository is

`contextkit` is importable context infrastructure for AI coding agents. It holds
four content types — **skills**, **personas**, **rules**, **knowledge** — and a
zero-dependency Node CLI that wires them into any other repository:

```bash
npx github:VictorYan1990/contextkit init        # in a consuming repo
```

This repository **is the central module**. Everything under `skills/`,
`personas/`, `rules/`, and `knowledge/` ships to every consumer, so write it as
if it will be read in a repo you have never seen. Domain-specific content
(Python tooling, a company's conventions, a person's profile) belongs in a
**sub-module**: a separate git repo with the same layout, registered in
`modules.json` and installed with `contextkit add <name>`. See
[`docs/architecture.md`](docs/architecture.md) and [`docs/modules.md`](docs/modules.md).

## Layout

| Path | Type | Role |
| --- | --- | --- |
| `AGENTS.md` | canonical | this file; auto-loaded as an always-applied rule |
| `skills/<name>/SKILL.md` | canonical | Layer 1 skills; dir name == frontmatter `name` |
| `personas/<name>.md` | canonical | subagent-compatible personas |
| `rules/*.md` | canonical | always-on guidance (`SOUL.md`, `USER.template.md`) |
| `knowledge/<topic>/*.md` | canonical | verified facts and decisions, one per file |
| `templates/consumer/` | canonical | files the CLI writes into a consuming repo |
| `templates/module/` | canonical | scaffold for `contextkit new-module` |
| `cli/`, `scripts/validate.js` | code | the installer and the module validator |
| `module.json`, `modules.json` | manifest | this module's identity; registry of sub-modules |
| `CLAUDE.md` | derived | imports `AGENTS.md` |
| `.claude/skills`, `.cursor/skills` | derived | symlink → `../skills` |
| `.claude/agents`, `.cursor/agents` | derived | symlink → `../personas` |

The links exist so that working on this repo dogfoods Layer 1 discovery. Claude
Code scans only `.claude/skills`; Cursor also scans `.agents/skills`, which this
repo does not have (that directory is the *consumer-side* aggregation point).
Use symlinks, never junctions; see the `ai-config-discovery` skill.

## Authoring conventions

- **Skills.** Frontmatter limited to what Claude Code and Cursor both honour:
  `name`, `description`, optional `disable-model-invocation`, optional `paths`.
  The description says *when to use* the skill; that text is all the model sees
  before deciding. Slash-command workflows set `disable-model-invocation: true`.
  Follow the `skill-authoring` skill.
- **Personas.** kebab-case `name` == file name, a when-to-use `description`,
  optional `tools`. Domain-neutral in central.
- **Rules.** Short and always-on. `rules/USER.md` is the owner's profile and
  the only place personal facts belong; keep it free of anything sensitive,
  because this repository is public. Skills, personas, and knowledge stay
  person-neutral.
- **Knowledge.** One claim per file from `knowledge/_template.md`, dated, with
  evidence. Capture with `/capture-knowledge`.
- **Never reference this repo's own paths or name from shipped content** except
  where the content is *about* contextkit. Consumers see it under `.contextkit/`.
- `node scripts/validate.js .` must pass before a commit.

## CLI conventions

- Node ≥ 18, CommonJS, **zero runtime dependencies**. Git is driven through
  `child_process.execFileSync('git', […])`, never a shell string.
- Every command is idempotent and safe to re-run; `doctor` never writes.
- Symlinks are always **relative**. On `EPERM` (Windows without Developer Mode)
  print the fix and suggest `--mode copy`; never fall back silently.
- Tests use `node --test` with temp directories and local bare repos; no network.
- The CLI never edits a consumer's files outside: `contextkit.json`, the managed
  block in `AGENTS.md`, `CLAUDE.md` (create only), `.gitignore` (append only),
  and the links it owns under `.agents/`, `.claude/`, `.cursor/`. The one
  exception is the two legacy scaffold sections in `AGENTS.md` that the block
  supersedes (`## Agent config layout`, `## Session start: Layer 1 skill
  check`); those are removed on merge. See `docs/architecture.md`.

## Personas

Reusable personas live in [`personas/`](personas/): `code-reviewer`, `planner`,
`tech-writer`. Adopt one by name when the task fits its description.

## Session start: Layer 1 skill check

On your **first substantive reply of a session only** — never repeat it on later
turns — check whether the skills in `skills/` appear in the available-skills
list you were given at startup, and report one line:

- All present → `Layer 1 skill discovery: OK (N project skills).`
- Any missing → name them and flag the likely broken `.claude/skills` or
  `.cursor/skills` link.

Count a skill with `disable-model-invocation: true` as present when it is
missing from that list — the list holds the skills the agent may volunteer, and
those are deliberately excluded. Confirm them by their slash command instead.
Only a skill you *could* invoke, yet cannot see, indicates a broken link.

Then continue with the user's request. Only diagnose further if asked; the
`ai-config-discovery` skill has the procedure, and `npm run doctor` runs the
mechanical checks.
