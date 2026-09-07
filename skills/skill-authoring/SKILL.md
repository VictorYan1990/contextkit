---
name: skill-authoring
description: >-
  How to write or revise a SKILL.md that both Claude Code and Cursor will load
  and the agent will actually volunteer at the right moment: the frontmatter
  contract, description phrasing, when to make a skill slash-only, sizing, and
  how to test discovery. Use when creating a new skill, editing a skill's
  frontmatter or description, deciding whether something should be a skill, a
  rule, a persona, or knowledge, or when a skill exists but never gets picked.
---

# Skill authoring

A skill is a procedure the agent should follow in a recognisable situation. Its
value depends on two things: the **description** (which decides whether it is
ever loaded) and the **body** (which decides whether following it helps).

## Is it a skill?

| It is a… | If it is… |
| --- | --- |
| **skill** | a procedure for a recognisable situation ("when X, do these steps") |
| **rule** | guidance that applies to every turn regardless of task |
| **persona** | a role with a mindset and checklist, adopted for a whole task |
| **knowledge** | a fact or decision, with evidence, that a procedure may cite |

If the text is mostly "remember that…", it is knowledge. If it is mostly "you
are a…", it is a persona. Only "when… do…" is a skill.

## Frontmatter contract

Use only fields both tools honour. Anything else is silently ignored by one of
them and becomes a portability trap.

```yaml
---
name: kebab-case-name            # REQUIRED; must equal the folder name
description: >-                  # REQUIRED; when to use, see below
  ...
disable-model-invocation: true   # optional; makes it a /slash-only workflow
paths: ["src/**", "tests/**"]    # optional; scope auto-activation to files
---
```

- `name` is the folder name. In Claude Code the command is derived from the
  folder, in Cursor from `name`; keeping them equal avoids two different names.
- Keep frontmatter under ~1,000 characters. Long descriptions are truncated in
  some tools' skill lists.

## Writing the description

The agent reads the description with no other context and must decide *now*
whether this skill applies. So:

1. Start with **what the skill does** in one clause.
2. Follow with **"Use when …"** listing the concrete triggers: user phrases,
   file types, error messages, moments in a workflow. Be specific enough that
   an unrelated task does not match, broad enough that paraphrases do.
3. If the skill must **not** be volunteered, say so in the description too
   ("Use only when the user types /name"), in addition to
   `disable-model-invocation: true`.

Bad: `description: Helps with skills.`
Good: see this file's own frontmatter.

## Slash-only or Layer 1?

Make a skill slash-only when running it uninvited would be costly, noisy, or
wrong: audits, generators, anything that writes many files or takes minutes.
Leave it Layer 1 when volunteering is the whole point: conventions, how-to
guidance, checks that are cheap.

## Body

- Lead with the one-paragraph mental model, then steps. Number steps that must
  happen in order; bullet those that do not.
- State what to **report** at the end. A skill without an output contract
  produces rambling.
- Keep `SKILL.md` under ~200 lines. Move long reference material into sibling
  files in the same folder and link to them; the body is loaded whole.
- Do not reference the repository the skill was written in. Shipped skills are
  read inside other repositories under a different path.
- Cross-reference other skills by name in backticks, not by path.

## Test it

1. `node scripts/validate.js .` (or `contextkit validate` in a module).
2. Start a **fresh** session in a repo where the skill is wired and confirm it
   appears in the available-skills list (slash-only skills appear in the `/`
   menu instead).
3. Give the agent a task that should trigger it, without naming it. If it is
   not volunteered, the description is the problem, not the body.

## Report

When you finish authoring: the skill name, Layer 1 or slash-only, the trigger
phrases you optimised for, and the result of the fresh-session test.
