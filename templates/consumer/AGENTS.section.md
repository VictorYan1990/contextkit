<!-- contextkit:begin — managed by `contextkit`; edits here are overwritten on update -->
## Agent config layout (contextkit)

`.agents/` is this repository's single source of truth for AI config. Shared
content comes from **contextkit** and is installed as a gitignored clone at
`.contextkit/`, pinned by the committed `contextkit.json`. Tool-specific
directories are **relative symlinks** — edit only canonical files:

| Path | Type | Role |
| --- | --- | --- |
| `AGENTS.md` | canonical | this file; auto-loaded as an always-applied rule |
| `.agents/skills/`, `.agents/personas/` | canonical | project-owned items, plus one symlink per contextkit item |
| `.contextkit/` | managed | the kit (`skills/`, `personas/`, `rules/`, `knowledge/`; sub-modules under `modules/`) |
| `contextkit.json` | manifest | pins source, ref, commit, and installed modules |
| `CLAUDE.md` | derived | thin file that imports `AGENTS.md` |
| `.claude/skills`, `.cursor/skills` | derived | symlink → `../.agents/skills` |
| `.claude/agents`, `.cursor/agents` | derived | symlink → `../.agents/personas` |

**Rules to apply on every turn** (read them once at session start):
{{RULES_LIST}}

**Knowledge** (verified facts and decisions; cite, do not restate):
{{KNOWLEDGE_LIST}}

**Installed modules:** {{MODULES_LIST}}

Do not edit anything under `.contextkit/`; `contextkit update` overwrites it.
Propose changes upstream in the owning module instead. If skills or personas
seem missing, run `npx contextkit doctor`; after a fresh clone run
`npx contextkit install`.

The links are **required**: Claude Code's skill scanner is hardcoded to
`.claude/skills` and has no setting for extra roots, so this file's guidance
cannot redirect it. Cursor also scans `.agents/skills/` directly. Use symlinks,
never junctions; on Windows this needs Developer Mode plus
`core.symlinks=true`. See the `ai-layout` skill.

**Manual audit:** type `/verify-ai-layout` to check Layer 1 discovery, the
links, and the contextkit install, then refresh stale project docs. That
workflow is explicit-only; it is not the session-start one-liner below.

### Session start: Layer 1 skill check

On your **first substantive reply of a session only** — never repeat it on later
turns — check whether the skills in `.agents/skills/` appear in the
available-skills list you were given at startup, and report one line:

- All present → `Layer 1 skill discovery: OK (N project skills).`
- Any missing → name them and flag the likely broken `.claude/skills` or
  `.cursor/skills` link, or a missing `.contextkit/` (run `npx contextkit install`).

Count a skill with `disable-model-invocation: true` as present when it is
missing from that list — the list holds the skills the agent may volunteer, and
those skills are deliberately excluded from it. Confirm them by their slash
command instead. Only a skill you *could* invoke, yet cannot see, indicates a
broken link.

Then continue with the user's request. Only diagnose further if asked; the
`ai-layout` skill has the procedure.
<!-- contextkit:end -->
