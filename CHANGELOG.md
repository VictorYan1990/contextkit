# Changelog

Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Versions
are `module.json`'s `version`, tagged as `v<version>` for consumers who pin a
tag in `contextkit.json`'s `ref` (see [`docs/modules.md`](docs/modules.md#version)).

## [Unreleased]

## [0.4.0] - 2026-09-20

First tagged release.

### Added

- CLI: `init`, `install`, `add`, `remove`, `update`, `eject`, `exclude`,
  `restore`, `list`, `doctor`, `new-module`, `validate` — zero runtime
  dependencies, Node ≥ 18.
- Central module content: `ai-layout`, `skill-authoring`, `capture-knowledge`,
  `verify-ai-layout` skills; `code-reviewer`, `planner`, `tech-writer`
  personas; the `SOUL.md` rule and a blank `USER.template.md`.
- The sub-module pattern for domain- or person-specific content, installed by
  registry name or any git URL (`docs/modules.md`).
- Consumer wiring: managed block in `AGENTS.md`, relative symlinks into
  `.claude/`/`.cursor/`, gitignored `.contextkit/` clone pinned by
  `contextkit.json`.
- Per-item customization in a consumer repo — `eject`, `exclude`, `restore` —
  so one skill or persona can diverge without losing the rest of the link.
- Managed clones are read-only in practice: dead push URL, detached HEAD, no
  local branch.
- CI: strict manifest/frontmatter validation, a check that tool links are
  committed as real symlinks (not gitignored), and a Node 18/20 self-install
  smoke test.
