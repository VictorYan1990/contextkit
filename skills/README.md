# Skills (canonical source of truth)

Each skill is a folder with a `SKILL.md` whose frontmatter carries `name`
(equal to the folder name) and a `description` that says **when to use it**. The
description is the only text the agent sees before deciding to load the skill.

Most skills are Layer 1: the agent may volunteer them. Skills with
`disable-model-invocation: true` are slash-command workflows, invoked as
`/name`; they still appear in the `/` menu but the agent must not auto-apply
them.

## How skills reach an agent

- **In this repository:** `.claude/skills` and `.cursor/skills` are relative
  symlinks to this directory.
- **In a consuming repository:** `contextkit init` creates one relative symlink
  per skill, `.agents/skills/<name> -> ../../.contextkit/skills/<name>`, and the
  standard `.claude/skills -> ../.agents/skills` link. Claude Code follows
  per-skill symlinks and de-duplicates by target; Cursor scans `.agents/skills`
  directly.

Do not edit skills inside a consumer's `.contextkit/`; change them here (or in
the owning sub-module) and run `contextkit update` in the consumer.

Authoring rules: see the `skill-authoring` skill. Layout and discovery: `ai-layout`. Validation:
`node scripts/validate.js .`
