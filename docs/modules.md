# Modules

A sub-module packages content for one domain, team, or person so that a
consumer can opt in. It is a separate git repository with the same layout as
central.

## Create

```bash
npx github:VictorYan1990/contextkit new-module python-dev --dir ~/projects/contextkit-python-dev
```

This copies `templates/module/`, fills in the name, runs `git init`, and makes a
first commit. The result:

```
contextkit-python-dev/
├── module.json          # name, kind: "module", version, description, requires
├── README.md
├── .gitignore
├── .github/workflows/ci.yml   # runs `contextkit validate .`
├── skills/  personas/  rules/  knowledge/
```

## Contract

- `module.json` has `name` (kebab-case, equals the registry key), `kind`
  (`module`), `version` (semver), `description`, `requires.contextkit` (semver range).
- `skills/<name>/SKILL.md` — `name` equals the folder; `description` says when to use.
- `personas/<name>.md` — `name` equals the file name; `description`; optional `tools`.
- `rules/*.md` — always-on; listed in the consumer's managed block automatically.
- `knowledge/<topic>/*.md` — one claim per file with frontmatter `title`, `date`, `status`, `tags`.
- Names must not collide with central. Prefer a domain prefix (`py-lint`, not `lint`).

`npx github:VictorYan1990/contextkit validate .` checks all of the above and is
what the module's CI runs.

## Publish

Push the repository anywhere the consumer can `git clone`: GitHub, Azure DevOps,
an internal server. Private is fine; the consumer's machine or CI needs read
access, nothing more.

## Register (optional)

Add an entry to central's `modules.json` so consumers can `add` by name:

```json
"python-dev": {
  "source": "https://github.com/VictorYan1990/contextkit-python-dev.git",
  "ref": "main",
  "description": "Python tooling: uv, ruff, pytest conventions and review checklist"
}
```

Unregistered modules install by URL: `contextkit add <git-url> --name python-dev`.

## Version

Tag releases (`v0.2.0`) and bump `module.json`'s `version`. Consumers that pin a
tag in `ref` only move when they choose to. Consumers that follow `main` move on
`update`.

## Where the user profile lives

Central is public, so it never ships a filled-in profile — only the blank
structure in `rules/USER.template.md`. The real one lives in a private module,
named `personal` by convention:

```bash
npx github:VictorYan1990/contextkit new-module personal \
  --dir ~/projects/contextkit-personal \
  --description "My profile and anything else too personal for the public kit"
```

Copy `rules/USER.template.md` into that module as `rules/USER.md` and fill it
in, push the module to a **private** repository, then register it (or skip the
registry and `add` by URL — see above) and `contextkit add personal` in any
repo where the agent should know who it's working with. The consumer's managed
block lists every installed module's rules, so the agent reads `SOUL.md` and
the private `USER.md` together, and the profile itself never enters a public
git history.
