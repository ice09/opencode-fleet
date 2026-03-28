# Fleet Coordinator Workspace

This workspace coordinates changes across multiple repositories that each run their own `opencode serve` backend.

## Working model

- Treat this workspace as orchestration-only unless a task explicitly targets coordinator files.
- Repo-local implementation belongs in the repo served by that repo's OpenCode backend.
- Prefer planning and aggregation here, implementation there.

## Source of truth

- `repos.json` defines the known fleet members and backend URLs.
- `.fleet-state.json` stores workflow-to-session mappings.
- `change-tracker.md` is the human-readable rollout checklist.

## Conventions

- Use one workflow key per cross-repo effort, for example `auth-v2`.
- Reuse that workflow key across every repo session.
- Keep prompts repo-specific once impact analysis is complete.
