# Change Tracker

Use one section per cross-repo workflow.

## Workflow: example-auth-v2

- Goal: migrate all repos to auth v2 without breaking the public API for one release
- Branch: `auth-v2`
- Rollout owner: unassigned
- Status: planning

| Repo | Impacted | Session | Branch | Tests | PR |
| --- | --- | --- | --- | --- | --- |
| repo-a | unknown | pending | pending | pending | pending |
| repo-b | unknown | pending | pending | pending | pending |
| repo-c | unknown | pending | pending | pending | pending |

## Checklist

- Confirm impacted repos from `fleet impact`
- Agree contract and rollout order
- Implement repo-local changes
- Run repo-local verification
- Open one PR per repo
- Link PRs in coordination issue/doc
