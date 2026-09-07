---
name: capture-knowledge
description: >-
  Turn something learned in the current conversation — a verified fact, a
  decision and its reasons, a trap and its fix — into a dated knowledge entry
  with evidence, and say whether it should be promoted to a skill or rule. Use
  only when the user types /capture-knowledge (optionally followed by what to
  capture); do not volunteer it.
disable-model-invocation: true
---

# Capture knowledge

Tacit knowledge that stays in chat is lost. This workflow writes it down once,
in a form the next agent can cite.

Honour any text after `/capture-knowledge` as the thing to capture. If there is
none, pick the most consequential thing established in this conversation and
say which one you chose.

## 1. Decide where it goes

| You are in… | Write to… |
| --- | --- |
| a contextkit module repo (has `module.json`) | `knowledge/<topic>/<slug>.md` |
| a consuming repo (has `contextkit.json`) | `.agents/knowledge/<topic>/<slug>.md`, and flag it for upstreaming |
| neither | `.agents/knowledge/<topic>/<slug>.md` |

Never write into a consumer's `.contextkit/`; that directory is managed and
`contextkit update` will discard the change.

`<topic>` is an existing kebab-case directory if one fits, else a new one.
`<slug>` is the claim in five words or fewer, kebab-case.

## 2. Check for an existing entry

Grep the target `knowledge/` tree for the key terms. If an entry already covers
the claim, **update it in place** with a dated note instead of adding a
duplicate. If an existing entry is contradicted, correct it and record why.

## 3. Write the entry

Copy the module's `knowledge/_template.md` (or the central one under
`.contextkit/knowledge/_template.md`) and fill every section:

- **Claim** in one or two sentences, stated as true, not as a story.
- **Context**: what was being attempted.
- **Evidence**: the command run and its output, the doc quoted with URL, or the
  experiment. Date anything that may drift. If it was not verified, set
  `status: hypothesis` and say what would verify it.
- **Consequence**: what to do differently. For a decision, the rejected
  alternatives and why.
- **Promote?**: `skill` if it is really a procedure that will recur, `rule` if
  it must apply on every turn, otherwise `leave`.

Frontmatter: `title`, `date` (today, ISO), `status` (`verified` | `decision` |
`hypothesis`), `tags`.

## 4. Report

One short block: the path written (or updated), the claim in one line, the
status, and the promotion recommendation. If the entry lives in a consumer,
add: "Upstream to `<module>` when convenient."
