# AGENTS.md

Canonical, vendor-neutral source of truth for AI agent guidance in this
repository. Tool-specific files re-export this one — edit here, not there.

## Project overview

<!-- Replace this paragraph: what the project is, in two or three sentences, and
     the one working slice an agent should understand first. -->
`{{PROJECT_NAME}}` — describe me.

## Key conventions

<!-- Decisions made over the life of the project that an agent must follow.
     Keep each to one line. Remove this comment. -->
- Do not commit secrets or `.env` files.
- Prefer editing existing files over creating new ones.

## Personas

Project-owned personas live in `.agents/personas/` next to the ones contextkit
provides. Adopt one by name when the task fits its description.

{{CONTEXTKIT_BLOCK}}
