---
name: verify-ai-layout
description: >-
  Verifies Layer 1 skill discovery, the .claude/.cursor symlinks, and (when
  present) the contextkit install, then scans the repo and updates stale
  project-specific files (README, AGENTS.md overview, personas). Use only when
  the user types /verify-ai-layout or explicitly asks to verify AI layout,
  skill discovery, or refresh repo-specific agent docs.
disable-model-invocation: true
---

# Verify AI layout

Manually triggered audit. Do **not** run from the session-start one-liner.

Honour extra instructions in the user message after `/verify-ai-layout`.

## 1. Layer 1 discovery

Introspection only — no shell needed.

1. List folders under `.agents/skills/` (or `skills/` in a module repo) that
   contain a `SKILL.md` and inspect their frontmatter.
2. Treat every skill without `disable-model-invocation: true` as eligible for
   Layer 1 discovery. Check each eligible skill against the available-skills
   list from session start.
3. Treat skills with `disable-model-invocation: true` as explicit-only. They
   are not expected in the Layer 1 list; confirm only that an explicitly named
   skill can be read and followed.
4. Note the **path** each Layer 1 skill was loaded from
   (`.agents/skills/…` vs `.cursor/skills/…` vs `.claude/skills/…`) and which
   tool this session is.
5. Flag any mismatch with `ai-config-discovery`.

Report: eligible skills present / missing, explicit-only skills excluded, load
path, and tool. Then continue — do not stop here.

## 2. Symlinks, contextkit, and derived files

From repo root, confirm the layout in `ai-layout-scaffold`:

```
.claude/skills  -> ../.agents/skills
.claude/agents  -> ../.agents/personas
.cursor/skills  -> ../.agents/skills
.cursor/agents  -> ../.agents/personas
```

Checks:

- `ls -la .claude .cursor` — each entry is a symlink (`l`), relative target,
  not a plain file and not a junction.
- Read-through: listing `.claude/skills` and `.claude/agents` shows the same
  names as `.agents/skills` and `.agents/personas`.
- `git check-ignore -v .claude/skills` must find nothing.
- If the links are committed: `git ls-files -s .claude .cursor` → mode `120000`.
- On Windows (or WSL with a `/mnt/c` checkout):
  `powershell.exe -NoProfile -Command "Get-ChildItem '<abs>\\.claude\\skills'"`

**If `contextkit.json` exists**, additionally:

- Run `npx contextkit doctor` and include its verdict verbatim.
- Confirm `AGENTS.md` contains the managed block between
  `<!-- contextkit:begin -->` and `<!-- contextkit:end -->`.
- Run `npx contextkit list` and report any module whose pinned `commit` is
  behind its `ref` (the CLI prints this). Do not update unless asked.
- Never edit anything under `.contextkit/`; if a shipped file needs changing,
  say which module owns it.

Repair without asking: missing `CLAUDE.md` (import-only, see scaffold), missing
parent dirs, missing or broken **relative** symlinks, dangling per-item links
that `npx contextkit install` restores. Recreate with `ln -s`; never a junction.
Do not change `git config`.

If a path exists but is the wrong type (plain file, junction, absolute target),
report it and ask before replacing.

## 3. Repo-specific content

Scan the working tree (ignore `.git` and `.contextkit/`). Infer what this
project **is** from code, manifests, and existing docs. Then update identity
that does not match:

| File | What to refresh |
| --- | --- |
| `README.md` | Short project description; drop leftover product/stack copy |
| `AGENTS.md` | Overview, conventions, personas pointer — keep the layout table, the managed contextkit block, and the Layer 1 self-check |
| `.agents/personas/*.md` (project-owned, not symlinks) | Domain, stack, when-to-use; kebab-case `name` + `description` + `tools` |

Rules:

- Keep it short. Prefer a working-slice description over a framework dump.
- Leave shipped skills and personas (symlinks into `.contextkit/`) untouched.
- Leave `CLAUDE.md` as an `AGENTS.md` import.
- If a project persona is for a domain this repo does not have, replace it with
  one that fits; do not leave a leftover identity.
- Do not invent a stack that is not in the tree.
- Do not commit, and do not touch `.env` or API keys.

## 4. Report

Lead with pass/fail for discovery, links, and (if present) `doctor`, then a
short list of files changed vs skipped. Open questions last. Do not re-run the
session-start one-liner.
