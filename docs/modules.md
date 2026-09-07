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

## The `personal` module

The one module central ships in its registry is `personal`: a private repository
holding `rules/USER.md` (the real user profile) and any personal working rules.
Central deliberately gitignores `rules/USER.md` so a profile can never land in a
public module by accident.
