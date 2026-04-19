# Change Tracker

Use one section per cross-repo workflow.

## Workflow: feature-1-customer-segment

- Goal: add `loyaltyStatus` to the bundled demo customer and order responses without breaking existing consumers
- Branch: `feature-loyalty-status`
- Rollout owner: unassigned
- Status: completed

| Repo | Impacted | Session | Branch | Tests | PR |
| --- | --- | --- | --- | --- | --- |
| customer-service | yes | `ses_258c1cd05ffe2IDgKahfuK5gT7` | `main` | `./gradlew test` | pending |
| order-service | yes | `ses_258c1cd1effeQ3wzIsQtPnjQIO` | `main` | `./gradlew test` | pending |

## Checklist

- Confirm impacted repos from the coordinator's impact summary
- Agree contract shape and rollout order
- Implement the producer change in customer-service
- Update order-service to consume the new field safely
- Implement repo-local changes
- Run repo-local verification
- Open one PR per repo
- Link PRs in coordination issue/doc
