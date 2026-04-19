# Fleet Coordinator Workspace

This workspace coordinates changes across multiple repositories that each run their own `opencode serve` backend.

## Working model

- Treat this workspace as orchestration-only unless a task explicitly targets coordinator files.
- Repo-local implementation belongs in the repo served by that repo's OpenCode backend.
- Prefer planning and aggregation here, implementation there.
- Do not directly edit bundled service repos from the coordinator when a repo-local backend is available; continue the saved repo session instead.
- Keep the user interaction natural-language first; the user should not need to invoke `fleet` commands directly unless debugging.
- When asked to coordinate a cross-repo feature, use `src/fleet.ts` behind the scenes to assess impact, preserve workflow sessions, and continue implementation in the impacted repos.
- After repo-local work advances, run `fleet sync <workflow>` to refresh `change-tracker.md` from the saved workflow sessions.
- The bundled showcase repos live in `customer-service/` and `order-service/`.

## Source of truth

- `repos.json` defines the known fleet members and backend URLs.
- `.fleet-state.json` stores workflow-to-session mappings.
- `change-tracker.md` is the human-readable rollout checklist.

## Conventions

- Use one workflow key per cross-repo effort, for example `auth-v2`.
- Reuse that workflow key across every repo session.
- Keep prompts repo-specific once impact analysis is complete.
- Return consolidated progress to the user from the coordinator workspace instead of making the user manually drive each repo.
