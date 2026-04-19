# OpenCode Fleet

OpenCode Fleet is a coordinator workspace for multi-repo OpenCode execution.

The intended user experience is simple: start `opencode` in this folder, describe the cross-repo change in plain language, and let the coordinator drive the impacted repositories in the right order.

<img src="docs/opencode-fleet.png">

## What is bundled here

This repo now includes a self-contained two-service showcase in subfolders:

- `customer-service` is a Spring Boot producer that exposes `GET /customers/{customerId}` on port `8081`
- `order-service` is a Spring Boot consumer that exposes `GET /orders/{orderId}/summary` on port `8082` and calls `customer-service`

That gives you three OpenCode entry points to try:

- `opencode` in this root coordinator workspace
- `opencode` in `customer-service/`
- `opencode` in `order-service/`

## What the coordinator does

- Keeps one `opencode serve` instance per repository
- Tracks workflow session IDs per repo in `.fleet-state.json`
- Fans out impact-analysis prompts across all repos
- Sends repo-specific implementation prompts only where needed
- Keeps rollout notes in `change-tracker.md`
- Syncs saved repo-session results back into `change-tracker.md`

## Local setup

1. Install coordinator dependencies.

```bash
npm install
```

2. Copy the sample registry. The example already points at the bundled showcase repos.

```bash
cp repos.example.json repos.json
```

3. Start both Spring Boot apps.

```bash
./start-showcase.sh
```

4. In another terminal, start one `opencode serve` backend per demo repo.

```bash
./start-opencode-servers.sh
```

5. Start `opencode` in this coordinator workspace and describe the cross-repo change in natural language.

```bash
opencode
```

If you prefer to run the pieces manually instead of using the helper scripts:

```bash
./customer-service/gradlew -p ./customer-service bootRun
./order-service/gradlew -p ./order-service bootRun
```

```bash
(cd customer-service && opencode serve --port 4001)
(cd order-service && opencode serve --port 4002)
```

## Example showcase prompt

```text
Coordinate a change across the bundled demo services.
customer-service runs on OpenCode port 4001 and order-service runs on 4002.
Add loyaltyStatus to the customer response, propagate it into the order summary response, keep the rollout backward compatible, and update tests.
```

A good rollout order is:

- update `customer-service` to expose the new field
- update `order-service` to consume it safely

That is exactly the kind of cross-repo change this workspace is for.

## Project layout

- `src/fleet.ts` - internal orchestration engine used by the coordinator
- `repos.example.json` - public-safe template for the bundled repo registry
- `repos.json` - local repo/server registry copied from the example file
- `.fleet-state.json` - generated workflow/session state
- `change-tracker.md` - human checklist for cross-repo work
- `customer-service/` - demo producer repo with its own `AGENTS.md` and `opencode.json`
- `order-service/` - demo consumer repo with its own `AGENTS.md` and `opencode.json`
- `shared-rules/` - OpenCode coordination rules for this workspace
- `start-showcase.sh` - starts both Spring Boot demo apps
- `start-opencode-servers.sh` - starts both repo-local OpenCode backends

## Advanced use

The `fleet` commands are still available for debugging, automation, or troubleshooting, but they are implementation details of the coordinator experience rather than the primary user workflow.

- `list` - list configured repos
- `status [workflow]` - show health for every repo and optional saved session IDs for a workflow
- `impact <workflow> <prompt>` - create or reuse one session per repo and request structured impact analysis
- `prompt <repo> <workflow> <prompt>` - continue one repo's workflow session with a free-form prompt
- `sync <workflow>` - refresh `change-tracker.md` and print a consolidated summary from the saved repo sessions

The coordinator should stay orchestration-only for bundled service changes. Use the repo-local backends for implementation and verification, then run:

```bash
npm run fleet:sync -- feature-1-customer-segment
```

## Public repo notes

- Commit `repos.example.json`, not `repos.json`
- `.fleet-state.json`, `node_modules/`, Gradle build output, and `dist/` stay local and are ignored
