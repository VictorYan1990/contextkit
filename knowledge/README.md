# Knowledge

Verified facts, decisions with their reasons, and traps with their fixes. The
point of this directory is to make tacit knowledge reusable: once something is
learned the hard way, it is written down once and travels with the module.

## What belongs here

| Belongs | Does not belong |
| --- | --- |
| A fact verified by observation, with the date and how it was checked | Speculation, or a fact copied from docs without checking |
| A decision, the alternatives considered, and why this one won | Task-specific notes for one session (`prompt.md`, scratch) |
| A trap, its symptom, and the fix | Anything that is really a procedure (that is a skill) |
| Reference pointers with context | Personal data (that goes in a private module's `rules/`) |

## Format

One entry per file: `knowledge/<topic>/<slug>.md`, from [`_template.md`](_template.md).
Topics are kebab-case directories (`ai-tooling`, `git`, `windows-wsl`, …). Add a
topic when the first entry needs it; do not pre-create empty ones.

Frontmatter carries `title`, `date` (ISO), `status` (`verified` | `decision` |
`hypothesis`), and `tags`. The body states the claim first, then the evidence.

## Lifecycle

- `/capture-knowledge` writes a new entry from the current conversation.
- An entry that keeps being needed as a procedure gets promoted to a skill.
- An entry that turns out wrong is corrected in place with a dated note, not deleted.
