# Change Tracker

Use one section per cross-repo workflow.

## Workflow: feature-1-customer-segment

- Goal: add `customerSegment` to the customer details response across A, the external API of A, and B without breaking existing consumers
- Branch: `feature-1-customer-segment`
- Rollout owner: unassigned
- Status: planning

| Repo | Impacted | Session | Branch | Tests | PR |
| --- | --- | --- | --- | --- | --- |
| a | unknown | pending | pending | pending | pending |
| external-api | unknown | pending | pending | pending | pending |
| b | unknown | pending | pending | pending | pending |

## Checklist

- Confirm impacted repos from the coordinator's impact summary
- Agree contract shape and rollout order
- Implement producer changes in A
- Expose the backward-compatible contract in external-api
- Update B to consume the new field safely
- Implement repo-local changes
- Run repo-local verification
- Open one PR per repo
- Link PRs in coordination issue/doc
