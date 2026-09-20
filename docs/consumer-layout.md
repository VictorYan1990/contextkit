# Consumer layout

What a repository looks like after `npx github:VictorYan1990/contextkit init`,
and how to live with it.

## The workflow, end to end

| Step | Who | What happens |
| --- | --- | --- |
| 1. `npx github:VictorYan1990/contextkit init` | developer, once | `.contextkit/` cloned (gitignored); `.agents/skills|personas` gain one symlink per kit item; four tool links created if missing; managed block written into `AGENTS.md`; `CLAUDE.md` created if missing; `contextkit.json` written; `doctor` runs. Commit the result. |
| 2. Start (or restart) the agent session | developer | Skills are scanned at startup, so the session must begin after step 1. The first reply reports the Layer 1 self-check from `AGENTS.md`. |
| 3. `/verify-ai-layout` or `contextkit doctor` | optional | Audit discovery, links, manifest, clone guards; repair broken relative links. |
| 4. Develop | developer, daily | Ignore `.contextkit/`. Add project-specific content as new files in `.agents/`; the kit's symlinks sit beside them. Do not edit through a symlink. |
| 5. `contextkit update` | developer, when wanted | Move the pin to the kit's latest commit, re-wire, re-render the block; commit `contextkit.json`. Fresh clones and CI run `install` instead. |
| 6. Contribute upstream | optional | Clone the kit repository, add the item, `validate`, open a PR. `.contextkit/` itself cannot push. |

Two rules make step 4 safe. First, the CLI only ever writes its own files and
links, so nothing you add to `.agents/` is touched by `update`; a name collision
with a kit item is refused rather than overwritten. Second, the managed clone is
disposable: anything changed inside `.contextkit/`, including edits made through
a symlink in `.agents/`, is lost on the next `update`, so project content must
be a real file in `.agents/`, not an edit to a linked one.

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

## The managed clone is read-only in practice

`.contextkit/` is a shallow git clone, and git cannot make a clone read-only.
The CLI does the next best thing on every `init`, `install`, and `update`: it
sets the push URL to a dead string, detaches HEAD, and deletes the local
branch. A `git push` from inside it fails with

```
fatal: 'NO_PUSH-contextkit-managed-clone-contribute-upstream-instead' does not appear to be a git repository
```

Local edits there are discarded by the next `update` and never enter the
consumer repo, which ignores the directory. Who can change the kit is decided by
the kit repository's own permissions; to contribute, clone the kit itself and
open a pull request. `doctor` warns when a clone is missing these guards.

## Project-owned content

Put your own skills in `.agents/skills/<name>/SKILL.md` and personas in
`.agents/personas/<name>.md`, next to the links. Names must not collide with kit
items; `doctor` reports collisions. Knowledge you capture locally goes in
`.agents/knowledge/`; upstream it to a module when it stops being project-specific.

## Customising per item: eject, exclude, restore

Links keep every repo on one source of truth; these three commands let a repo
diverge one item at a time without giving that up.

- **`eject <item>`** makes an item project-owned: it replaces a kit symlink with
  a real copy of the upstream file or folder, and records `{ module, commit,
  hash }` under `overrides` in `contextkit.json`. If a real file is already
  sitting at that path — most commonly because `init`/`update`/`add` refused it
  as a collision — `eject` adopts it **as-is, untouched**, instead: it never
  overwrites content that isn't a kit link or a recorded copy. Either way, the
  item is now project-owned: `update` and `install` skip it, collisions do not
  apply, and you edit it like any project file. `doctor` and `update` compare
  the recorded hash with the current upstream item and warn when upstream has
  changed, so you can merge the change by hand if you want it. When `init` or
  `add` refuses a collision, its error names the exact `eject` command to run —
  that error also still leaves `contextkit.json` written, specifically so
  `eject` has a manifest to record the override in before you retry.
- **`exclude <item>`** removes the link and records the key under `excludes`.
  `update` will not recreate it. Use it for kit items that do not apply to this
  repo.
- **`restore <item>`** reverses either. Restoring an eject deletes your copy, so
  it requires `--force`; git history keeps the edits.

Item specs accept the short name (`skill-authoring`, `code-reviewer`) or the
full key (`skills/skill-authoring`, `personas/code-reviewer.md`). The manifest
is the record, so commit it: teammates and CI reproduce the same set from
`install`.

Prefer the cheaper option when it fits: repo-specific guidance usually belongs
in `AGENTS.md` next to the managed block, where the agent reads it together with
the unchanged kit skill.

## Migrating a repo that already has the scaffold

Repos set up by hand, or with an earlier version of the `ai-layout` skill, already have
`.agents/`, the four tool links, and local copies of the layout skills. `init`
handles the overlap:

- **Local copies of kit items** collide with the kit's links. Run `init`; it
  refuses each collision by name and tells you the `eject <item>` command that
  adopts your copy as a project-owned override, untouched, so it survives every
  future `update`. Only delete a copy first if you genuinely want the kit's
  version instead — that is the one case where deleting first and re-running
  `init` is correct. Never delete a copy just to make the collision error go
  away without checking first; if it turns out to have been a real
  customization, that permanently discards it. Until you commit an eject's
  result (or a plain relink), doctor reports "git still tracks old files at
  this path" and now also spells out the same restore-and-eject advice, in case
  the working tree already has the link and the tracked copy was never
  formally ejected.
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
