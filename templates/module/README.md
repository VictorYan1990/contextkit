# contextkit-{{MODULE_NAME}}

A [contextkit](https://github.com/VictorYan1990/contextkit) sub-module.

{{MODULE_DESCRIPTION}}

## Install into a repository

```bash
npx github:VictorYan1990/contextkit add {{MODULE_NAME}}          # if registered in central modules.json
npx github:VictorYan1990/contextkit add <git-url-of-this-repo>   # otherwise
```

## Layout

| Path | Content |
| --- | --- |
| `skills/<name>/SKILL.md` | skills the agent may volunteer, or `/slash` workflows |
| `personas/<name>.md` | subagent-compatible personas |
| `rules/*.md` | always-on guidance, loaded via the consumer's `AGENTS.md` |
| `knowledge/<topic>/*.md` | verified facts and decisions |

Any directory may be absent. Skill and persona names must not collide with the
central module or with other modules a consumer is likely to install together
with this one; prefer a domain prefix (`py-…`) when in doubt.

## Validate

```bash
npx github:VictorYan1990/contextkit validate .
```
