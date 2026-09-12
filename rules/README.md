# Rules

Always-on guidance. Unlike a skill, a rule is not chosen by relevance; an agent
reads every rule at the start of a session because the consuming repository's
`AGENTS.md` tells it to (the managed contextkit block does this for every
installed module).

| File | Role |
| --- | --- |
| `SOUL.md` | How the agent works and communicates. Identity and stance, no personal facts. |
| `USER.md` | Profile of the person the agent supports: preferences, working style, how to address them. Limited to what its owner is comfortable publishing. |
| `USER.template.md` | Blank structure for `USER.md`, for anyone forking the kit or keeping a fuller profile in a private module. |

Keep rules short. Anything that only applies in a specific situation is a skill,
not a rule. Anything that is a fact about the world is knowledge, not a rule.

This repository is public, so `USER.md` holds only non-sensitive facts. Anything
more (employer details, health, contacts) belongs in a private sub-module's
`rules/`; the consumer's managed block lists every installed module's rules, so
the agent reads both.
