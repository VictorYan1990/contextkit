# Personas

Reusable personas that double as tool-native subagents. In a consuming repo they
are reachable through `.claude/agents` and `.cursor/agents` (symlinks into
`.agents/personas/`), where each file is itself a symlink back to this module.

Frontmatter contract (shared by Claude Code and Cursor subagents):

```yaml
---
name: kebab-case-name        # must equal the file name without .md
description: >               # when to use it, in one or two sentences
  ...
tools: Read, Grep, Glob      # optional; omit to inherit everything
---
```

Central personas are domain-neutral. A persona that knows a stack or a product
belongs in a domain module (`python-dev`, …) or in the consuming project's own
`.agents/personas/`.
