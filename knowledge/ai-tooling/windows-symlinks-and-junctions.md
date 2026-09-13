---
title: On Windows, AI-config links must be real symlinks made with Developer Mode on; junctions and WSL fallbacks break
date: 2026-08-26
status: verified
tags: [ai-tooling, windows, wsl, symlinks, git]
---

# On Windows, AI-config links must be real symlinks made with Developer Mode on; junctions and WSL fallbacks break

## Claim

The four tool links (`.claude/skills`, `.claude/agents`, `.cursor/skills`,
`.cursor/agents`) and contextkit's per-item links must be **relative NTFS
symlinks**. On Windows that requires Developer Mode once per machine and
`git config core.symlinks true` in the repo. Junctions and the WSL-only
fallback both look like links and both fail.

## Context

Setting up the `.agents/` + symlink layout on a Windows 11 machine with WSL2,
checkout under `/mnt/c`, used from both Windows-native tools (Cursor,
PowerShell, native Claude Code) and WSL.

## Evidence

Measured on that machine:

| Method | Needs admin | Windows reads it | WSL reads it | Git-portable |
| --- | --- | --- | --- | --- |
| WSL `ln -s` on `/mnt/c`, Developer Mode **off** | no | **no** | yes | yes (relative) |
| WSL `ln -s` on `/mnt/c`, Developer Mode **on** | no | yes | yes | yes (relative) |
| NTFS symlink (`New-Item -ItemType SymbolicLink`) | yes, unless Developer Mode | yes | yes | yes (relative) |
| Junction (`mklink /J`) | no | yes | yes | **no** (absolute) |

- A junction stores an **absolute** target, so git commits
  `/mnt/c/Users/<you>/repos/<repo>/.agents/skills` instead of `../.agents/skills`.
  Every other clone gets a dead link. Junctions are also directory-only.
- With Developer Mode off, WSL's `ln -s` on `/mnt/c` cannot create an NTFS
  symlink and silently writes a WSL-only LX reparse point. WSL follows it;
  Windows-native tools fail with *"The file cannot be accessed by the system"*,
  and `dir` shows it as `<JUNCTION>` with an unreadable `[...]` target. This
  was the actual cause of a "broken junction pointing at `C:\`" seen in one
  repo, not link rot.
- With `core.symlinks=false`, `git checkout` writes each link as a **plain text
  file containing the target path**. Tools then see a file, not a directory.

Enable Developer Mode once (elevated PowerShell), or via Settings → System →
For developers:

```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' `
  -Name AllowDevelopmentWithoutDevLicense -Value 1
```

Then `git config core.symlinks true` **before** checkout. Afterwards `ln -s`
from WSL, `git checkout` from either side, and PowerShell all produce the same
NTFS symlink that every tool traverses.

Verification from Windows:
`powershell.exe -NoProfile -Command "Get-ChildItem '<abs>\.claude\skills'"`.

## Consequence

Always create links with `ln -s` and a relative target; never `mklink /J`. If a
platform cannot create symlinks at all, use `contextkit init --mode copy`
(tracked copies with recorded hashes), never a junction. `contextkit doctor`
flags absolute targets and plain-file "links".

## Promote?

Leave as knowledge; the `ai-layout` skill carries the procedure and cites this.
