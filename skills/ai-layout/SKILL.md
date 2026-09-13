---
name: ai-layout
description: >-
  How AI coding tools discover a repository's skills, personas, and rules; the
  one-source-of-truth layout (`.agents/` plus relative symlinks into `.claude/`
  and `.cursor/`, and contextkit's `.contextkit/`); and how to set it up,
  repair it, and prove it is discovered. Use when asked to set up, bootstrap,
  standardise, or explain AI agent config, skills, personas, or rules layout;
  when a skill did or did not load; when asked about global vs project skills;
  or when the session-start Layer 1 check reports a discovery failure.
---

# AI layout

Edit AI guidance in one place; every tool finds it. This skill states how tools
load content, the structure that satisfies all of them, how to set it up, and
how to prove it worked. Evidence lives in the kit's knowledge entries
`skill-discovery-locations` and `windows-symlinks-and-junctions`
(`knowledge/ai-tooling/`, under `.contextkit/` in a consumer); cite them, do
not restate them.

## 1. How tools load content

Two layers. **Layer 1** is the tool's engine: before the model reads anything
it scans a fixed set of hardcoded paths and injects skill names and
descriptions, always-applied rules, and subagents. This is code; prose cannot
redirect it. **Layer 2** is the model reading `AGENTS.md`, rule files, and
skill bodies after Layer 1 decided what exists. A skill only in Layer 2 can be
followed when named, never volunteered, and has lost its main value.

| Tool | Project skills scanned from | Subagents / personas |
| --- | --- | --- |
| Claude Code | `.claude/skills/` only (cwd and parents to repo root) | `.claude/agents/` |
| Cursor | `.agents/skills/`, `.cursor/skills/`, and `.claude/skills/` (recursive) | `.cursor/agents/` |
| Codex, Gemini CLI, Copilot | `.agents/skills/` | tool-specific |

Facts that decide the design:

- Claude Code has **no setting** for extra skill roots, so `.claude/skills`
  must exist. A skill entry may be a symlink to a directory elsewhere; it is
  followed, and one target reachable by several links loads once.
- The gitignore check applies to the **link path**, not the resolved target. A
  link whose target sits in a gitignored `.contextkit/` still loads (verified).
- Global skills live in `~/.claude/skills/` and `~/.agents/skills/` and apply to
  every repo; project skills travel with the repo.

## 2. The target structure

| Path | Type | Role |
| --- | --- | --- |
| `AGENTS.md` | canonical | vendor-neutral guidance; carries the session-start Layer 1 self-check |
| `.agents/skills/<name>/SKILL.md` | canonical | project skills, plus one symlink per kit skill |
| `.agents/personas/<name>.md` | canonical | project personas, plus one symlink per kit persona |
| `CLAUDE.md` | derived | `@AGENTS.md` import only |
| `.claude/skills`, `.cursor/skills` | derived | relative symlink → `../.agents/skills` |
| `.claude/agents`, `.cursor/agents` | derived | relative symlink → `../.agents/personas` |
| `.contextkit/` | managed | gitignored clone of the kit; never edited by hand |
| `contextkit.json` | manifest | committed pin of source, ref, commit, modules |

Rules: symlinks, never junctions; targets always relative; the links are
committed (mode `120000`) and never gitignored; `.contextkit/` is always
gitignored; rules and knowledge are read by path from the managed block in
`AGENTS.md`, not linked.

## 3. Setup

**Step 0, preferred.** If Node ≥ 18 is available:

```bash
npx github:VictorYan1990/contextkit init      # first time
npx github:VictorYan1990/contextkit install   # after a fresh clone
```

This does everything below deterministically and ends with `doctor`. Skip to
section 4. Use the manual steps only when the repo must stay free of
contextkit, Node is unavailable, or you are offline.

**Manual fallback, non-destructive.** For each path: create it if missing;
if it exists, skip it and add it to a "left untouched" list. When done, show
that list and ask before changing any existing content.

1. `mkdir -p .agents/skills .agents/personas`. Add `.agents/skills/README.md`
   saying this directory is canonical and the tool directories link into it.
   Personas get subagent frontmatter: kebab-case `name` equal to the file name,
   a when-to-use `description`, optional `tools`.
2. `AGENTS.md`: one line naming it the canonical source; project overview and
   conventions inferred from the repo; a personas pointer; the layout table
   above; and the **session-start self-check** block (agents check once, on
   the first reply of a session, that the `.agents/skills/` entries appear in
   their available-skills list, and report one line either way; slash-only
   skills count as present). This block lives in `AGENTS.md` because a broken
   link means no skill metadata loaded, so only an always-applied file can
   catch it.
3. `CLAUDE.md` containing only a heading and `@AGENTS.md`.
4. The four links:

   ```bash
   mkdir -p .claude .cursor
   ln -s ../.agents/skills   .claude/skills
   ln -s ../.agents/personas .claude/agents
   ln -s ../.agents/skills   .cursor/skills
   ln -s ../.agents/personas .cursor/agents
   git config core.symlinks true
   ```

5. `.gitignore`: ignore only personal or secret files
   (`.claude/settings.local.json`, `*.local.json`, `.cursor/mcp.json`, `.ai/`).
   Do not ignore the link paths.

**Windows.** Developer Mode must be on and `core.symlinks=true` set before
checkout, or `ln -s` from WSL on `/mnt/c` silently produces a link Windows
tools cannot read, and checkout writes links as text files. The registry
command, the measurements, and the symptoms are in
`windows-symlinks-and-junctions`. If symlinks are impossible, use
`contextkit init --mode copy`; never a junction.

## 4. Verify and troubleshoot

Mechanical checks, cheapest first:

- `npx github:VictorYan1990/contextkit doctor` when `contextkit.json` exists.
- `ls -la .claude .cursor`: each entry is a symlink (`l`) with a relative target.
- `git ls-files -s .claude .cursor`: mode `120000` on every link.
- `git check-ignore -v .claude/skills`: must print nothing.
- On a Windows-hosted checkout: `powershell.exe -NoProfile -Command "Get-ChildItem '<abs>\.claude\skills'"`.

**The only real proof is a fresh session**: start a new session and confirm
the skills appear in its available-skills list. Claude Code watches
`.claude/skills/` for changes only if the directory existed at startup, so the
first setup always needs a restart. The self-check in `AGENTS.md` then reports
the result without being asked.

When the self-check fails, diagnose in this order:

1. Link missing → recreate it (step 4).
2. Link is a plain file holding a path → `core.symlinks` was false at checkout;
   set it and re-checkout.
3. Per-item links dangle → `.contextkit/` is missing; run `contextkit install`.
4. Windows cannot traverse it → Developer Mode is off; fix that, then recreate.
5. Path is gitignored → un-ignore the link path.

A full audit with repairs is `/verify-ai-layout`; the user types it, do not
volunteer it.

## 5. Your obligation

When this skill is relevant, say how you *actually* discovered the content in
question this session (which path, which tool). If that differs from section 1,
flag the mismatch clearly and verify on the filesystem rather than assuming.
The mismatch is itself the finding.
