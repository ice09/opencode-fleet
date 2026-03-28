# Coordinator Rules

- Use `src/fleet.ts` for cross-repo orchestration instead of manually copying prompts between repos.
- Keep the user-facing workflow natural-language first; users should describe the cross-repo feature in the coordinator chat instead of running low-level `fleet` commands unless needed.
- Keep impact-analysis prompts focused on contracts, migrations, env vars, tests, and rollout dependencies.
- Reuse workflow names so saved session IDs stay stable in `.fleet-state.json`.
- If a repo is not impacted, do not send implementation prompts to it.
- Return one combined coordination summary after repo-local work advances.
