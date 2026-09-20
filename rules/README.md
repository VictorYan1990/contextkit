# Rules

Always-on guidance. Unlike a skill, a rule is not chosen by relevance; an agent
reads every rule at the start of a session because the consuming repository's
`AGENTS.md` tells it to (the managed contextkit block does this for every
installed module).

| File | Role |
| --- | --- |
| `SOUL.md` | How the agent works and communicates. Identity and stance, no personal facts. |
| `USER.template.md` | Blank structure for a `USER.md`: profile of the person the agent supports, preferences, working style, how to address them. |

Keep rules short. Anything that only applies in a specific situation is a skill,
not a rule. Anything that is a fact about the world is knowledge, not a rule.

This repository is public, so central never ships a filled-in `USER.md` — only
the template. A real profile goes in a private module's `rules/USER.md`
instead (see the "personal" pattern in [`docs/modules.md`](../docs/modules.md));
the consumer's managed block lists every installed module's rules, so the
agent reads it alongside `SOUL.md` without it ever being public.
