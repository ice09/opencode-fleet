# OpenCode Fleet

A control plane for multi-repo AI engineering.

OpenCode Fleet turns a group of large repositories into a coordinated system instead of one oversized prompt. Each repository runs its own `opencode serve` backend, keeping its local rules, sessions, tools, and warmed context close to the code. On top of that, a lightweight coordinator workspace tracks workflows, fans out impact-analysis prompts, stores repo session mappings, and routes follow-up implementation prompts only where they belong.

The key product idea is that the human stays in one coordinator conversation. The human should not need to manually juggle repo-by-repo commands unless debugging. They start `opencode` in the coordinator folder, describe the feature, and the coordinator handles the orchestration.

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

## User experience

The intended flow looks like this:

1. Start one `opencode serve` instance in each repository.
2. Start `opencode` in the coordinator workspace.
3. Tell the coordinator what cross-repo feature or migration should happen.
4. Let the coordinator assess impact, choose rollout order, and continue repo-local sessions.
5. Review the combined progress summary instead of manually driving every repo.

Bundled showcase prompt:

```text
Coordinate a change across the bundled demo services.
customer-service runs on :4001 and order-service runs on :4002.
order-service depends on customer-service over HTTP.
Add loyaltyStatus to the customer response and propagate it into the order summary response.
Keep the rollout backward compatible and update tests where needed.
```

Behind the scenes, the coordinator can still use `src/fleet.ts` to fan out impact analysis, preserve one workflow key, and continue repo-local execution sessions.
After repo-local prompts complete, `fleet sync <workflow>` refreshes `change-tracker.md` from the saved sessions instead of relying on coordinator-side edits in the service repos.

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
                  +---------------------+---------------------+
                  |                                           |
                  v                                           v
+------------------------+                    +------------------------+
| customer-service       |                    | order-service          |
|------------------------|                    |------------------------|
| opencode serve :4001   |                    | opencode serve :4002   |
| app port :8081         |                    | app port :8082         |
| AGENTS.md              |                    | AGENTS.md              |
| opencode.json          |                    | opencode.json          |
| customer contract      |                    | depends on customer    |
+------------------------+                    +------------------------+
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

A single chat across multiple large repos feels convenient at first, but it creates hidden failure modes: bloated context, weak locality, unclear state, and poor repeatability. OpenCode Fleet replaces that with a composable model while still preserving a single top-level user experience:

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
- producer API consumer rollouts such as `customer-service -> order-service`

## What makes it compelling

OpenCode Fleet gives you the best of both worlds:

- the precision of repo-local AI context
- the leverage of centralized orchestration

It treats cross-repo engineering as a first-class workflow instead of an awkward extension of single-repo tooling.

## Short pitch

OpenCode Fleet is a multi-repo control plane for OpenCode: one backend per repository, one coordinator above them, and one natural-language coordinator conversation that can analyze, execute, and track changes across an entire code fleet.
