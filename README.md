# contextkit

Importable context infrastructure for AI coding agents.

A repository's AI guidance tends to be rebuilt from scratch each time: the same
`AGENTS.md` conventions, the same review persona, the same hard-won facts about
how Claude Code or Cursor discover skills. contextkit keeps that material in one
versioned place and wires it into any repository with one command, the way a
package manager installs a dependency.

```bash
# in the repository that should receive the kit
npx github:VictorYan1990/contextkit init
```

After that the repo has a gitignored `.contextkit/` clone, a committed
`contextkit.json` pinning the exact commit, and relative symlinks that make the
kit's skills and personas visible to Claude Code and Cursor at session start.
Collaborators run `npx github:VictorYan1990/contextkit install` after cloning.

## Workflow in a consumer repository

1. **Install, then commit.** `npx github:VictorYan1990/contextkit init` clones
   the kit into `.contextkit/`, wires it into `.agents/`, `.claude/`, `.cursor/`,
   and writes the managed block in `AGENTS.md`. Commit `contextkit.json`,
   `AGENTS.md`, `CLAUDE.md`, and the new links.
2. **Start the agent session after the install.** Tools scan skills at
   startup, so a session opened before `init` will not see the kit; restart it.
   The session's first reply reports `Layer 1 skill discovery: OK (N project
   skills)` on its own.
3. **Optionally audit.** Type `/verify-ai-layout` in the session, or run
   `npx github:VictorYan1990/contextkit doctor` outside it.
4. **Ignore `.contextkit/` and work.** Project-specific AI content goes in
   `.agents/` as new files next to the kit's symlinks: skills in
   `.agents/skills/<name>/SKILL.md`, personas in `.agents/personas/`, local
   knowledge in `.agents/knowledge/`. Never edit *through* a symlink; that
   changes the managed clone and the next `update` discards it.
5. **Keep current.** `npx github:VictorYan1990/contextkit update` moves to the
   latest kit commit; commit the changed `contextkit.json`. After a fresh clone
   or in CI, `install` restores `.contextkit/` from the pin.
6. **Optionally contribute back.** Content that would help other repos goes
   upstream: clone the kit repository itself (not `.contextkit/`, which cannot
   push), add the item, run `validate`, and open a pull request. Domain-specific
   material belongs in a sub-module rather than central.

## What is in the kit

| Content type | Where | What it is |
| --- | --- | --- |
| Skills | `skills/<name>/SKILL.md` | Procedures the agent volunteers when relevant, or slash commands |
| Personas | `personas/<name>.md` | Subagent-compatible roles: `code-reviewer`, `planner`, `tech-writer` |
| Rules | `rules/*.md` | Always-on guidance: how the agent works (`SOUL.md`), user profile template |
| Knowledge | `knowledge/<topic>/*.md` | Verified facts and decisions, dated, with evidence |

This repository is the **central module**. Domain-specific content lives in
**sub-modules**: separate repositories with the same layout, listed in
[`modules.json`](modules.json) and added with `contextkit add <name>` (or any
git URL). A sub-module has its own git history, `.gitignore`, and CI, so it is
optional and independently versioned.

## CLI

| Command | Purpose |
| --- | --- |
| `init` | Install the central module into the current repo and wire it |
| `install` | Restore from an existing `contextkit.json` (fresh clone, CI) |
| `add <name\|url>` / `remove <name>` | Add or remove a sub-module |
| `update [name\|--all]` | Move to the pinned ref's latest commit and re-wire |
| `eject <item>` | Make one kit skill or persona a project-owned copy you can edit |
| `exclude <item>` | Drop one kit item from this repo |
| `restore <item> [--force]` | Undo an eject or exclude |
| `list [--available]` | Installed modules, or the registry |
| `doctor` | Check links, manifest, and collisions; exit 1 on failure |
| `new-module <name>` | Scaffold a new sub-module repository |
| `validate [path]` | Validate a module's manifest and frontmatter |

Options common to `init`: `--source <git-url>`, `--ref <branch|tag>`,
`--mode link|copy`, `--with <module>…`.

## Customising kit items in a consumer repo

Kit items arrive as symlinks so every repo stays on one source of truth, but you
decide per item when to diverge:

| You want to… | Do this | Effect |
| --- | --- | --- |
| Add guidance specific to this repo | Write it in `AGENTS.md` or as a new file under `.agents/` | Read alongside the kit's content; nothing to maintain |
| Edit a kit skill or persona for this repo | `npx github:VictorYan1990/contextkit eject code-reviewer` | The link becomes a real, editable file in `.agents/`; `update` leaves it alone; `doctor` tells you when upstream changed it |
| Drop a kit item you do not want here | `npx github:VictorYan1990/contextkit exclude capture-knowledge` | Link removed; `update` does not bring it back |
| Go back to the kit version | `npx github:VictorYan1990/contextkit restore <item> [--force]` | Re-links it; `--force` is required to delete an ejected copy |

Items are named by skill or persona name (`code-reviewer`) or by key
(`skills/code-reviewer`, `personas/planner.md`). Both decisions are recorded in
`contextkit.json` under `overrides` and `excludes`, so teammates and CI get the
same result from `install`. Never edit a kit file *through* its symlink: that
changes the managed clone and the next `update` discards it. Eject first.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — content types, modules, the two-layer loading model, install flow
- [`docs/consumer-layout.md`](docs/consumer-layout.md) — what `init` writes, what is committed, update and uninstall
- [`docs/modules.md`](docs/modules.md) — creating, validating, publishing, and registering a sub-module
- [`AGENTS.md`](AGENTS.md) — conventions for working in this repository

## Requirements

Node ≥ 18 and git on the consuming machine. On Windows, symlinks need Developer
Mode and `git config core.symlinks true`; otherwise use `--mode copy`.

## Credits

The shape of the content (routing `AGENTS.md`, `SOUL.md` + `USER.md`, skills,
accumulated knowledge) is informed by
[grapeot/context-infrastructure-en](https://github.com/grapeot/context-infrastructure-en).
contextkit adds the importable, modular packaging.

MIT.
