# Consumer layout

What a repository looks like after `npx github:VictorYan1990/contextkit init`,
and how to live with it.

## Files

```
my-repo/
├── AGENTS.md            # yours; contains one managed block
├── CLAUDE.md            # created if missing: `@AGENTS.md`
├── contextkit.json      # committed manifest
├── .gitignore           # gains `.contextkit/`
├── .contextkit/         # gitignored clone of central (+ modules/<name>/)
├── .agents/
│   ├── skills/          # your skills + one symlink per kit skill
│   └── personas/        # your personas + one symlink per kit persona
├── .claude/skills  -> ../.agents/skills      .claude/agents -> ../.agents/personas
└── .cursor/skills  -> ../.agents/skills      .cursor/agents -> ../.agents/personas
```

## `contextkit.json`

```json
{
  "source": "https://github.com/VictorYan1990/contextkit.git",
  "ref": "main",
  "commit": "3f2a…",
  "mode": "link",
  "modules": {
    "python-dev": { "source": "https://github.com/VictorYan1990/contextkit-python-dev.git", "ref": "v0.2.0", "commit": "9c1d…" }
  }
}
```

`ref` is what you follow (branch or tag); `commit` is what you have. `update`
moves `commit` to the tip of `ref`. Pin a tag in `ref` for repos that should not
move without a deliberate decision.

## Daily use

| Situation | Command |
| --- | --- |
| Fresh clone of the repo | `npx github:VictorYan1990/contextkit install` |
| Pick up upstream changes | `npx github:VictorYan1990/contextkit update` |
| Add a domain module | `npx github:VictorYan1990/contextkit add python-dev` |
| Something looks missing | `npx github:VictorYan1990/contextkit doctor` |
| See what is installed | `npx github:VictorYan1990/contextkit list` |

Commit `contextkit.json` and the links after `init`, `add`, `remove`, `update`.

## CI

Add one step before anything that relies on the kit:

```yaml
- run: npx --yes github:VictorYan1990/contextkit install
```

Private modules need credentials the runner can use for `git clone` (an SSH key
or a token in the URL via `--source`/manifest override).

## Project-owned content

Put your own skills in `.agents/skills/<name>/SKILL.md` and personas in
`.agents/personas/<name>.md`, next to the links. Names must not collide with kit
items; `doctor` reports collisions. Knowledge you capture locally goes in
`.agents/knowledge/`; upstream it to a module when it stops being project-specific.

## Migrating a repo that already has the scaffold

Repos set up by hand with the `ai-layout-scaffold` skill already have
`.agents/`, the four tool links, and local copies of the layout skills. `init`
handles the overlap:

- **Local copies of kit items** collide with the kit's links. Delete the copies
  from `.agents/skills/` and `.agents/personas/` first, then run `init`. Until
  you commit, doctor reports "git still tracks old files at this path"; the
  commit turns the tracked files into tracked symlinks.
- **`## Agent config layout` and `## Session start: Layer 1 skill check`** in
  `AGENTS.md` are replaced by the managed block, in place. Everything else in
  the file stays.
- **Links to deleted personas** in your own sections are reported by doctor as
  dead links; fix them by hand, since that text is yours.

Then commit `contextkit.json`, `AGENTS.md`, and the new links.

## Uninstall

```bash
npx github:VictorYan1990/contextkit remove --all   # removes links, modules, manifest, managed block
rm -rf .contextkit
```

The four tool links and `CLAUDE.md` are left in place because they serve your
own `.agents/` content too.
