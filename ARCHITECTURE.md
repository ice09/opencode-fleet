# OpenCode Fleet

A control plane for multi-repo AI engineering.

OpenCode Fleet turns a group of large repositories into a coordinated system instead of one oversized prompt. Each repository runs its own `opencode serve` backend, keeping its local rules, sessions, tools, and warmed context close to the code. On top of that, a lightweight coordinator workspace tracks workflows, fans out impact-analysis prompts, stores repo session mappings, and routes follow-up implementation prompts only where they belong.

The result is a better operating model for real systems: repo-local context stays sharp, cross-repo change becomes explicit, and large rollouts stop depending on one fragile, overloaded chat session.

## The idea

Most AI coding workflows break down when work spans many big repositories. A single session gets noisy, mixes unrelated context, forgets repo-specific conventions, and struggles to manage rollout order. OpenCode Fleet solves that by separating orchestration from implementation.

- Each repo gets its own OpenCode backend and keeps its own context.
- A coordinator workspace handles planning, workflow state, and cross-repo visibility.
- Changes are analyzed across the fleet, then implemented repo by repo.
- One workflow key ties the whole rollout together.

This is the same pattern used in good distributed systems: local autonomy, centralized coordination.

## What problem it solves

- Huge repos no longer compete for one context window.
- Repo-specific `AGENTS.md` and config stay authoritative.
- Cross-repo impact analysis becomes repeatable.
- Rollout state is tracked explicitly instead of living in chat history.
- Session continuity is preserved per repo, per workflow.

## How it works

1. Start one `opencode serve` instance in each repository.
2. Register those backends in a coordinator workspace.
3. Run a fleet-wide impact prompt against all repos.
4. Store the resulting session IDs under one workflow name, like `auth-v2`.
5. Follow up only in impacted repos with repo-local implementation prompts.
6. Track progress, testing, branches, and PRs in one place.

## Architecture Sketch

```text
                          +-----------------------------+
                          |     Coordinator Workspace   |
                          |-----------------------------|
                          | repos.json                  |
                          | .fleet-state.json           |
                          | change-tracker.md           |
                          | src/fleet.ts                |
                          +-------------+---------------+
                                        |
                       fans out prompts, stores sessions,
                       aggregates impact, tracks workflow
                                        |
          +-----------------------------+-----------------------------+
          |                             |                             |
          v                             v                             v
+-------------------+       +-------------------+       +-------------------+
| Repo A            |       | Repo B            |       | Repo C            |
|-------------------|       |-------------------|       |-------------------|
| opencode serve    |       | opencode serve    |       | opencode serve    |
| AGENTS.md         |       | AGENTS.md         |       | AGENTS.md         |
| opencode.json     |       | opencode.json     |       | opencode.json     |
| local sessions    |       | local sessions    |       | local sessions    |
| local tools/LSP   |       | local tools/LSP   |       | local tools/LSP   |
+-------------------+       +-------------------+       +-------------------+
```

## Core principle

Plan globally, execute locally.

The coordinator should know:

- which repos exist
- which workflow is active
- which session belongs to which repo
- what order the rollout should follow

Each repo backend should know:

- its own codebase
- its own standards and rules
- its own diffs, tests, and local reasoning trail

## Why this is better than one giant session

A single chat across multiple large repos feels convenient at first, but it creates hidden failure modes: bloated context, weak locality, unclear state, and poor repeatability. OpenCode Fleet replaces that with a composable model:

- bounded context per repo
- explicit workflow state
- reusable impact-analysis flow
- cleaner prompts
- easier handoff between planning and implementation

## Mental model

Think of it like Kubernetes for coding sessions.

- Per-repo `opencode serve` instances are the workers.
- The coordinator is the control plane.
- Workflow keys are rollout identifiers.
- Repo sessions are long-lived execution contexts.

## Typical use cases

- API contract migrations across services
- shared auth or billing rollouts
- schema and client updates across frontend/backend repos
- versioned deprecations that require staged implementation
- fleet-wide impact mapping before opening PRs

## What makes it compelling

OpenCode Fleet gives you the best of both worlds:

- the precision of repo-local AI context
- the leverage of centralized orchestration

It treats cross-repo engineering as a first-class workflow instead of an awkward extension of single-repo tooling.

## Short pitch

OpenCode Fleet is a multi-repo control plane for OpenCode: one backend per repository, one coordinator above them, and a workflow-driven way to analyze, execute, and track changes across an entire code fleet.
