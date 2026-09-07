---
name: ai-layout-scaffold
description: >-
  Scaffold a vendor-neutral AI agent config layout in a repository: a canonical
  .agents/ source of truth (AGENTS.md, personas, skills), relative symlinks
  wiring it into .claude/ and .cursor/ so both tools discover skills at session
  start, CLAUDE.md importing AGENTS.md, and optionally the contextkit install
  that populates it. Use when the user asks to set up, create, bootstrap, or
  standardise AI agent config / rules / skills / personas layout, wants a
  "source of truth + link" structure for AI tooling, or asks how to bring
  contextkit into a repo.
---

# AI Layout Scaffold

Create a **single source of truth** for AI agent config under `.agents/`, then
wire it into the tool-specific directories with relative symlinks. You edit one
place; every agent stays in sync.

## Core principle

- **Canonical (edit here):** `AGENTS.md`, `.agents/personas/`, `.agents/skills/`.
- **Derived (never edit directly):** `CLAUDE.md` (imports `AGENTS.md`), and the
  `.claude/*` / `.cursor/*` symlinks.
- **Links are required, not decorative.** Claude Code's skill scanner is
  hardcoded to `.claude/skills` and has no setting for extra roots, so prose in
  `AGENTS.md` cannot make it find `.agents/skills/`. Cursor *does* scan
  `.agents/skills/` directly, so its links are technically redundant — wire them
  anyway for symmetry, and so the layout does not depend on one vendor's
  current behaviour.

See `ai-config-discovery` for the two-layer loading model and the evidence
behind these claims.

## Step 0 — prefer the installer

If the repository should receive shared skills, personas, and rules from
contextkit (and Node ≥ 18 is available), run:

```bash
npx github:VictorYan1990/contextkit init
```

It performs steps 1–6 below mechanically and idempotently, adds the kit's
content as per-item symlinks, writes `contextkit.json`, and finishes with
`doctor`. Then skip to step 7. Use the manual steps when the repo must stay
free of contextkit, Node is unavailable, or you are offline.

## Idempotency rule (important)

This skill is **non-destructive**. For every file or directory below:

1. If it does **not** exist → create it.
2. If it **already** exists → **skip it** and record it in a "skipped
   (already exists)" list.

After processing everything, if anything was skipped:

- Present the list of existing files that were left untouched.
- **Ask the user** whether to update/overwrite any of them, and wait for
  confirmation before changing existing content. Do not overwrite silently.

## Steps

Run all path checks relative to the repository root.

### 1. Create the canonical `.agents/` tree

```
.agents/
├── personas/     # reusable personas (source of truth)
└── skills/       # reusable Agent Skills (source of truth)
```

- If `.agents/skills/README.md` is missing, create it explaining that this dir
  is canonical and that the tool-specific dirs are symlinks into it.
- Add at least one example persona in `.agents/personas/` only if the directory
  is empty. If personas already exist, leave them.
- Personas double as tool-native subagents through the `agents` links, so give
  each one subagent-compatible frontmatter: kebab-case `name`, a `description`
  that says *when to use it*, and an optional `tools` list.

### 2. Create `AGENTS.md` (instructions source of truth)

If `AGENTS.md` does not exist at the repo root, create it with, at minimum:
- a one-line note that it is the canonical, vendor-neutral source of truth;
- a project overview and key conventions (infer from the repo; keep concise);
- a "Personas" section pointing at `.agents/personas/`;
- an "Agent config layout" section documenting the link model below;
- a short **session-start Layer 1 self-check** block (see step 6). This must
  live in `AGENTS.md`, not in a skill description — if discovery is broken, no
  skill metadata loaded, so only an always-applied rule can catch it.

If it already exists, skip and report it.

### 3. Create `CLAUDE.md` (import, not a copy)

If `CLAUDE.md` does not exist, create it so Claude Code re-exports the canonical
file instead of duplicating it:

```markdown
# CLAUDE.md

This project keeps its agent guidance in the vendor-neutral `AGENTS.md`:

@AGENTS.md

Do not duplicate guidance here — edit `AGENTS.md` instead.
```

### 4. Wire the tool-specific links

Create four **relative** symlinks:

```
.claude/skills  -> ../.agents/skills
.claude/agents  -> ../.agents/personas
.cursor/skills  -> ../.agents/skills
.cursor/agents  -> ../.agents/personas
```

```bash
mkdir -p .claude .cursor
ln -s ../.agents/skills   .claude/skills
ln -s ../.agents/personas .claude/agents
ln -s ../.agents/skills   .cursor/skills
ln -s ../.agents/personas .cursor/agents
git config core.symlinks true
```

**Never use a junction (`mklink /J`).** It stores an *absolute* target, so git
commits a machine-specific path instead of `../.agents/skills`, breaking every
other clone. Symlinks are relative and portable.

**On Windows, enable Developer Mode first.** Without it, `ln -s` from WSL on
`/mnt/c` silently creates a WSL-only reparse point that Windows-native tools
cannot traverse (`The file cannot be accessed by the system`) — the classic
"broken junction" symptom. Elevated PowerShell, once per machine:

```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' `
  -Name AllowDevelopmentWithoutDevLicense -Value 1
```

Also set `core.symlinks=true` **before** checkout — with `false`, git writes
each link as a plain text file containing the target path.

If a target platform cannot support symlinks at all, fall back to a real copy
plus a sync step — never a junction. Flag the trade-off to the user.

### 5. Update `.gitignore`

Ensure the shared config **is committed** and only personal/secret files are
ignored. Add these entries if absent (do not remove unrelated existing rules):

```gitignore
# AI assistants — commit AGENTS.md, CLAUDE.md, .agents/, and the tool links.
# Ignore only personal/secret files:
.claude/settings.local.json
*.local.json
.cursor/mcp.json           # may hold secrets; template it if you commit one
.ai/                       # scratch prompts / working notes
```

The link paths must **not** be ignored — Claude Code skips skill directories it
detects as gitignored. (`.contextkit/` *is* ignored when the installer is used;
only the per-item links under `.agents/` are committed.)

### 6. Add the session-start self-check to `AGENTS.md`

A short always-applied block telling agents to verify, **once at the start of a
session and not again**, that the project skills appear in their available-skills
list, and to report a single line either way. This turns a silent Layer 1
failure into a visible one.

### 7. Verify and report

- `ls -la .claude .cursor` — confirm each entry is a symlink (`l` mode bit) with
  a relative target, not a plain file and not a junction.
- Confirm read-through on every platform in use. On Windows:
  `powershell.exe -NoProfile -Command "Get-ChildItem '<abs>\.claude\skills'"`
- `git check-ignore -v .claude/skills` must find nothing.
- `git ls-files -s .claude .cursor` — each link should show mode `120000`.
- If contextkit is installed: `npx contextkit doctor`.
- Start a fresh agent session and confirm the skills appear in its
  available-skills list. **This is the only real proof**; a link that exists but
  is not scanned still fails.
- Summarise: what was created, what was skipped, and any open questions.

For a later audit (discovery + symlink health + refreshing stale README /
overview / persona copy), the user runs `/verify-ai-layout`. Do not run that
workflow from this skill unless they asked.

## Caveats to surface to the user

- **Format drift:** a tool may expect specific frontmatter for its custom
  agents/skills. Adjust per tool if it rejects a shared file — most commonly a
  persona lacking a `tools` field or using a non-kebab-case `name`.
- **Vendor behaviour changes:** the scanned paths are implementation details of
  each tool. Re-verify with the self-check after a major tool upgrade rather
  than trusting this document.
