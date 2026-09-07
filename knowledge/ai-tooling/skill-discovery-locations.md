---
title: Where Claude Code and Cursor discover project skills, and how they treat symlinks
date: 2026-09-07
status: verified
tags: [ai-tooling, claude-code, cursor, skills, symlinks]
---

# Where Claude Code and Cursor discover project skills, and how they treat symlinks

## Claim

- **Claude Code** loads project skills only from `.claude/skills/<name>/SKILL.md`
  (cwd and every parent up to the repo root, plus `--add-dir` roots). A `<name>`
  entry may be a **symlink to a directory elsewhere**; it is followed, and a
  target reachable from several links is loaded **once**.
- **Cursor** walks `.agents/skills/` and `.cursor/skills/` recursively and, for
  compatibility, also reads `.claude/skills/`.

## Context

Designing contextkit's consumer wiring: the kit is cloned into `.contextkit/`
(gitignored) and must become visible to both tools without copying files.

## Evidence

- Claude Code docs, "Skills" page (https://code.claude.com/docs/en/skills),
  fetched 2026-09-07: project location `.claude/skills/<skill-name>/SKILL.md`;
  "A `<skill-name>` entry can be a symlink to a directory elsewhere on disk";
  "If the same target is reachable from multiple locations, Claude Code loads
  the skill once." The page does not mention gitignore filtering.
- Earlier observation recorded in the `ai-config-discovery` skill: the scanner
  logs `Skipped gitignored skills dir` when the **skills directory itself** is
  gitignored. Whether a symlink whose *target* is gitignored is skipped was not
  documented; see the contextkit end-to-end verification.
- Cursor docs, "Agent Skills" (https://cursor.com/docs/context/skills), fetched
  2026-09-07: loads `.agents/skills/`, `.cursor/skills/`, `~/.agents/skills/`,
  `~/.cursor/skills/`; recognises `.claude/skills/` for backward compatibility;
  walks the root recursively.

## Consequence

Per-skill symlinks `.agents/skills/<name> -> ../../.contextkit/skills/<name>`
plus the existing `.claude/skills -> ../.agents/skills` link are a supported
path for both tools. Keep the link itself (not just its target) un-ignored.

## Promote?

Leave as knowledge; the `ai-config-discovery` skill already carries the
operational guidance.
