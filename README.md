# contextkit

[![ci](https://github.com/VictorYan1990/contextkit/actions/workflows/ci.yml/badge.svg)](https://github.com/VictorYan1990/contextkit/actions/workflows/ci.yml)

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

## Is this repository for you?

This is **Victor's personal kit**, published to show the pattern — versioned
skills, personas, rules, and knowledge, wired into any repo with one command —
not as something meant to be cloned wholesale. His own profile stays out of it
entirely; see [`rules/USER.template.md`](rules/USER.template.md) and the
private-module pattern in [`docs/modules.md`](docs/modules.md#where-the-user-profile-lives).

Three ways to use it, cheapest first:

1. **Install it as-is** if several of the shipped skills or personas
   (`ai-layout`, `skill-authoring`, `code-reviewer`, `planner`, `tech-writer`, …)
   are useful to you as they are — they're written domain-neutral on purpose.
   Add anything of your own as project-owned files in `.agents/` per repo, or
   your own private sub-module for things you use everywhere; you never touch
   this repo. `eject`/`exclude` (below) handle the rest.
2. **Fork it** if you want the same CLI and layout with your own skills,
   personas, and rules replacing these — keep the installer, swap the content.
3. **Build your own from scratch** if you'd rather not depend on this CLI at
   all. The pattern — `AGENTS.md` + `skills/` + `personas/` + `rules/` +
   `knowledge/`, wired with symlinks so tools discover it — is the actual idea;
   this repository is one implementation of it.

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

Node ≥ 18 and git on the consuming machine.

**Windows is not supported natively.** Symlink mode is only developed and
tested on macOS/Linux, WSL included. On native Windows, either do your agent
work from inside WSL, or pass `--mode copy` to install real file copies
instead of symlinks — that also happens to make per-repo customization easier,
at the cost of running `update` by hand when you want upstream changes merged
in.

## Credits

The shape of the content (routing `AGENTS.md`, `SOUL.md` + `USER.md`, skills,
accumulated knowledge) is informed by
[grapeot/context-infrastructure-en](https://github.com/grapeot/context-infrastructure-en).
contextkit adds the importable, modular packaging.

MIT.
