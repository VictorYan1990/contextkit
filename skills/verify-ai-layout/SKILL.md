---
name: verify-ai-layout
description: >-
  Audits the AI config layout: Layer 1 skill discovery, the .claude/.cursor
  symlinks, and the contextkit install, and repairs missing or broken relative
  links. Use only when the user types /verify-ai-layout or explicitly asks to
  verify AI layout or skill discovery; do not volunteer it.
disable-model-invocation: true
---

# Verify AI layout

Manually triggered audit with limited repairs. Honour extra instructions after
`/verify-ai-layout`. Do not run the session-start one-liner again.

## 1. Layer 1 discovery (introspection, no shell)

1. List the entries of `.agents/skills/` (or `skills/` in a module repo) that
   contain a `SKILL.md`; read their frontmatter.
2. Skills without `disable-model-invocation: true` must appear in the
   available-skills list you were given at session start. Slash-only skills are
   expected to be absent from that list; confirm each can be read by name.
3. Note which path each skill was loaded from and which tool this session is.
   Compare with the `ai-layout` skill; a mismatch is a finding.

## 2. Mechanical checks

- If `contextkit.json` exists: run `npx github:VictorYan1990/contextkit doctor`
  and quote its verdict. It covers links, modes, gitignore, the manifest, the
  managed `AGENTS.md` block, legacy sections, and dead links.
- Otherwise: `ls -la .claude .cursor` (symlinks with relative targets),
  `git ls-files -s .claude .cursor` (mode `120000`),
  `git check-ignore -v .claude/skills` (nothing), and read-through of
  `.claude/skills` and `.claude/agents` against `.agents/`.
- On a Windows-hosted checkout (`/mnt/c` or native):
  `powershell.exe -NoProfile -Command "Get-ChildItem '<abs>\.claude\skills'"`.

## 3. Repairs

Without asking: recreate a missing or broken **relative** symlink with `ln -s`;
create a missing `CLAUDE.md` containing only `@AGENTS.md`; create missing
`.agents/skills` or `.agents/personas` directories.

Say, do not do: if `.contextkit/` is missing or per-item links dangle, report
"run `npx github:VictorYan1990/contextkit install`".

Ask first: replacing a path that exists with the wrong type (plain file,
junction, absolute target). Never touch `.contextkit/`, `git config`, `.env`,
or any content outside the layout.

## 4. Report

Pass or fail for discovery and for links, the doctor verdict verbatim, repairs
made, then open questions. Keep it to a screen.
