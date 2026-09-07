# Rules

Always-on guidance. Unlike a skill, a rule is not chosen by relevance; an agent
reads every rule at the start of a session because the consuming repository's
`AGENTS.md` tells it to (the managed contextkit block does this for every
installed module).

| File | Role |
| --- | --- |
| `SOUL.md` | How the agent works and communicates. Identity and stance, no personal facts. |
| `USER.template.md` | Structure for a user profile. Copy to a **private** module as `rules/USER.md`; never fill it in here. |

Keep rules short. Anything that only applies in a specific situation is a skill,
not a rule. Anything that is a fact about the world is knowledge, not a rule.

A real `rules/USER.md` is gitignored in the central module on purpose. The
central module may be public; the profile of a real person is not.
