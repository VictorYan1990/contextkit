# Architecture

## The problem

AI coding agents load guidance from a small set of hardcoded locations in each
repository. The guidance that matters most — how to review, how to plan, how a
particular person wants to be spoken to, what was learned the hard way about a
tool — is the same across repositories, yet it is usually re-typed per repo and
drifts. contextkit makes that material a **dependency**: versioned in one place,
installed with one command, updated deliberately.

## Content types

| Type | Loaded | Answers |
| --- | --- | --- |
| **Skill** | Layer 1 metadata always; body on demand or by `/name` | "When X happens, what do I do?" |
| **Persona** | On demand, or as a subagent through `.claude/agents` / `.cursor/agents` | "Who am I for this task?" |
| **Rule** | Every session, via the consumer's `AGENTS.md` | "How do I always behave?" |
| **Knowledge** | On demand, cited from skills or read when relevant | "What is true, and how do we know?" |

The distinction is operational, not taxonomic: a skill is a procedure, a rule is
unconditional, a persona is a role, knowledge is evidence. When a piece of text
does not fit, it is usually two pieces.

## Two-layer loading

1. **Layer 1 — the tool's engine.** Before the model sees anything, Claude Code
   scans `.claude/skills/`; Cursor scans `.agents/skills/` and `.cursor/skills/`.
   Whatever is not in those directories does not exist for the model. This is
   code; prose cannot change it.
2. **Layer 2 — the model.** `AGENTS.md`, rule files, and skill bodies are
   instructions the model follows after Layer 1 has decided what is available.

contextkit therefore has two jobs: get content into the Layer 1 locations
(links), and get the always-on parts read at Layer 2 (the managed block in
`AGENTS.md`). The `ai-config-discovery` skill documents the evidence.

## Modules

A **module** is a git repository with `module.json` and any of `skills/`,
`personas/`, `rules/`, `knowledge/`. There are two kinds:

- **central** — this repository. Domain-neutral; every consumer gets it.
- **module** — a sub-module for one domain, team, or person. Its own repository,
  history, `.gitignore`, and CI. Registered in central's `modules.json` for
  name-based install, or installed by URL from anywhere (GitHub, Azure DevOps).

Modules do not depend on each other; the CLI only requires that skill and
persona names not collide within one consumer.

## Install flow (`contextkit init`)

```
consumer repo                              contextkit repo(s)
─────────────                              ──────────────────
contextkit.json  ◀── pin (source, ref, commit, modules)
.contextkit/     ◀── git clone --depth 1 ── central
.contextkit/modules/<m>/ ◀── git clone ─── sub-module m
.agents/skills/<s>    ── symlink ──▶ .contextkit/**/skills/<s>
.agents/personas/<p>  ── symlink ──▶ .contextkit/**/personas/<p>.md
.claude/skills, .cursor/skills  ── symlink ──▶ ../.agents/skills
.claude/agents, .cursor/agents  ── symlink ──▶ ../.agents/personas
AGENTS.md        ◀── managed block (rules, knowledge, modules, self-check)
CLAUDE.md        ◀── created if missing (@AGENTS.md)
.gitignore       ◀── + .contextkit/
```

Committed: `contextkit.json`, `AGENTS.md`, `CLAUDE.md`, every symlink.
Ignored: `.contextkit/`. After a fresh clone the links dangle until
`contextkit install` recreates the clone — the same contract as `node_modules`.

`--mode copy` replaces every symlink with a copy plus a recorded hash, for
platforms that cannot create symlinks. `update` refuses to overwrite a copy
whose hash no longer matches, so local edits are never silently lost.

## What the CLI will never do

Touch files it does not own. Its write set in a consumer is exactly:
`contextkit.json`; the block between `<!-- contextkit:begin -->` and
`<!-- contextkit:end -->` in `AGENTS.md`; `CLAUDE.md` if absent; a `.gitignore`
line if absent; the links (or copies) it created under `.agents/`, `.claude/`,
`.cursor/`; and `.contextkit/` itself.

One deliberate exception: two hand-written `AGENTS.md` sections that the
managed block supersedes, `## Agent config layout` and
`## Session start: Layer 1 skill check` (the headings the `ai-layout-scaffold`
skill produced before contextkit). `init` and `install` remove them and place
the block where the first one was, so an agent never reads two layout tables or
two self-check instructions. The removed text is only ever the scaffold's own,
and git history keeps it.
