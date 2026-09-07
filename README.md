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
| `list [--available]` | Installed modules, or the registry |
| `doctor` | Check links, manifest, and collisions; exit 1 on failure |
| `new-module <name>` | Scaffold a new sub-module repository |
| `validate [path]` | Validate a module's manifest and frontmatter |

Options common to `init`: `--source <git-url>`, `--ref <branch|tag>`,
`--mode link|copy`, `--with <module>…`.

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
