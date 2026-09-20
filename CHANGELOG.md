# Changelog

Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Versions
are `module.json`'s `version`, tagged as `v<version>` for consumers who pin a
tag in `contextkit.json`'s `ref` (see [`docs/modules.md`](docs/modules.md#version)).

## [Unreleased]

### Fixed

- A first-time collision between a project-owned file and a kit item name
  (`init`/`add`) used to be a dead end: the manifest was never written, so
  `eject` (which requires one) couldn't be run to resolve it, leaving "delete
  the file and retry" as the only visible way past the error — silently
  discarding real content if that file wasn't actually stale. Now: (1) `eject`
  adopts a pre-existing real file in place, untouched, instead of refusing it;
  (2) the collision error names the exact `eject` command to run; (3) `init`
  persists `contextkit.json` even when the collision aborts it, so that command
  actually works; (4) `doctor`'s "tracked as mode …" / "git still tracks old
  files" warnings now say the same thing for anyone who hits this after the
  fact, once the working tree already has the link.

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
