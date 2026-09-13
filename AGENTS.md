# Codex remote development workflow

These instructions apply **only to Codex running from this Mac**. They do not apply to Claude or other agents already running locally on `<host>`; those agents should use their own local working directory and command environment.

## Project overview

OpsDash is a control surface for Dagmar workflows. It is no longer being built for Paperclip-style observability; treat `docs/openclaw-paperclip-control-plane-primitives.md` as historical context, not current product direction.

## Engineering principles

These are implementation constraints, not slogans. Apply them by default.

- **KISS:** Prefer the minimum straightforward code that solves the accepted problem: explicit control flow, typed interfaces, and localized error paths over clever or implicit behavior.
- **YAGNI:** You Aren't Gonna Need It – do not add configuration, feature flags, interfaces, workflow branches, or abstractions without a concrete accepted v0 use case. OpsDash makes no backward-compatibility promise to earlier drafts, legacy code, libraries, APIs, or workflow formats; do not preserve obsolete behavior. Reject unsupported paths explicitly rather than offering partial or fake support.
- **DRY, after the rule of three:** Keep small local duplication when it is clearer. Extract a shared utility only after the pattern has appeared at least three times and stabilized.
- **Focused boundaries:** Keep modules responsible for one concern. Use narrow interfaces; do not create god modules that mix workflow scheduling policy, transport, persistence, and executor behavior.
- **Fail fast and explicitly:** Surface unsupported or unsafe states with clear errors. Never silently swallow failures, broaden permissions, or introduce an undocumented fallback.
- **Lifecycle safety:** Never mutate non-terminal persisted workflow or task state solely because it appears stale or its owner is ambiguous. Follow the explicit recovery and lifecycle rules in the repository specification instead.
- **Determinism and reversibility:** Keep validation reproducible, avoid unguarded timing or network-dependent tests, and make changes small enough to review and roll back safely.
- **Surgical scope:** Change only what the task requires. Do not refactor, reformat, or remove unrelated code; remove only imports, variables, or functions made unused by the current change.
- **Think before coding:** State material assumptions and tradeoffs. Do not silently choose between interpretations that would materially change the design; surface the ambiguity and ask.
- **Verifiable goals:** Define concrete success criteria before a multi-step change and verify each meaningful step rather than declaring the task done on plausibility alone.

This repository lives on the remote host **<host>**. Its local SSHFS mount is:

```text
/Users/<user>/Volumes/<host>/opsdash
```

## Files

- Work against the local mounted repository path above. It represents the remote `<host>` checkout; do not treat the Mac host as the project environment.
- Read and edit repository files through the local mounted path, using the normal local editing workflow (for example, `apply_patch`).
- Do not write repository files through an SSH shell unless the user explicitly asks for that.

## Package management

- Use `bun` for OpsDash dependency management and project scripts. Commit and maintain `bun.lock`; do not create or update `package-lock.json`, `pnpm-lock.yaml`, or Yarn lockfiles.
- Run project dependency and test commands on `<host>` through Tailscale SSH.
- Use `bun install` when intentionally changing dependencies; use `bun install --frozen-lockfile` for verification after the lockfile exists.
- Do not install project dependencies globally.

## Commands

- Run project commands on the remote host, not on the Mac.
- Connect with Tailscale SSH as `<host>`:

  ```sh
  tailscale ssh <user>@<tailnet-ip> -- 'cd /home/<host>/opsdash && <command>'
  ```

- Use `/home/<host>/opsdash` as the remote working directory. It is the same repository exposed locally at `/Users/<user>/Volumes/<host>/opsdash`.
- Before testing, inspecting dependencies, or running Git commands, ensure the command is executed on `<host>` through Tailscale SSH.

## Parallel feature work and Git

- Treat `/home/<host>/opsdash` (branch `main`) as the clean integration checkout. Do not implement features directly in it.
- Give every independent Codex feature task its own remote Git worktree and feature branch:

  ```text
  Remote worktree: /home/<host>/worktrees/opsdash/<feature>
  Local mount path: /Users/<user>/Volumes/<host>/worktrees/opsdash/<feature>
  Branch: codex/<feature>
  ```

- Create and manage worktrees with Git commands on `<host>`; read and edit their files through the corresponding local mounted path.
- Worktrees should always branch from fresh `main`. Update `main` first, then create the feature branch from it — never branch off another feature or integration branch.
- Before editing, run `git status --short` in the relevant worktree. Preserve any changes that do not belong to the current task.
- Avoid assigning separate agents to overlapping files. Agree on shared interfaces before implementing dependent features.

### Commit strategy

- Use "Conventional Commits" style for commit messages. Each commit should have a clear, imperative subject line and a body that explains the reasoning behind the change.
- Work in small, cohesive commits. Each commit should implement one logical change and have an imperative, descriptive subject.
- Stage only files relevant to the current task. Do not commit credentials, local configuration, generated artifacts, or unrelated changes.
- Commit completed feature work only to its `codex/<feature>` branch. Do not merge, rebase, force-push, reset shared branches, delete worktrees, or update `main` unless the user explicitly asks.
- Before asking to integrate a feature, provide its branch name, commit list, and test results for review.

### Pull requests

- Before proposing a pull request, inspect the branch diff against `main` and ensure its commits are focused, the documentation reflects behavior changes, and no secrets or unrelated files are included.
- A pull-request description must state the problem and approach, the user-visible or behavioral changes, tests/checks run, and known limitations or follow-up work.
- Do not push a branch or open a pull request unless the user explicitly asks.
