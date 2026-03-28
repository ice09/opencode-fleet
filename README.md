# OpenCode Fleet

OpenCode Fleet is a small coordinator for multiple per-repo `opencode serve` backends.

## What it does

- Keeps one `opencode serve` instance per repository
- Tracks workflow session IDs per repo in `.fleet-state.json`
- Fans out impact-analysis prompts across all repos
- Sends repo-specific follow-up prompts to one repo at a time
- Keeps rollout notes in `change-tracker.md`

## Project layout

- `src/fleet.ts` - SDK-based coordinator CLI
- `repos.example.json` - public-safe template for your repo/server registry
- `repos.json` - local repo/server registry copied from the example file
- `.fleet-state.json` - generated workflow/session state
- `change-tracker.md` - human checklist for cross-repo work
- `shared-rules/` - OpenCode coordination rules for this workspace

## Local setup

1. Install dependencies.

```bash
npm install
```

2. Copy the sample registry and point it at your real repositories.

```bash
cp repos.example.json repos.json
```

3. Set any password environment variables referenced by `repos.json`. You can copy values from `.env.example` into your shell or your preferred env loader.

```bash
export REPO_A_OPENCODE_PASSWORD=repo_a_secret
export REPO_B_OPENCODE_PASSWORD=repo_b_secret
export REPO_C_OPENCODE_PASSWORD=repo_c_secret
```

4. Start one backend per target repository. Run each command from that repository's root.

```bash
OPENCODE_SERVER_PASSWORD="$REPO_A_OPENCODE_PASSWORD" opencode serve --port 4101
OPENCODE_SERVER_PASSWORD="$REPO_B_OPENCODE_PASSWORD" opencode serve --port 4102
OPENCODE_SERVER_PASSWORD="$REPO_C_OPENCODE_PASSWORD" opencode serve --port 4103
```

5. Use the coordinator from this repo.

List repos:

```bash
npm run fleet -- list
```

Check server health and saved workflow sessions:

```bash
npm run fleet -- status auth-v2
```

Run cross-repo impact analysis:

```bash
npm run fleet -- impact auth-v2 "Assess the impact of migrating from auth v1 to auth v2. Focus on contracts, env vars, rollout order, and test coverage."
```

Send a follow-up prompt to one repo:

```bash
npm run fleet -- prompt repo-a auth-v2 "Implement the repo-local changes for auth v2. Keep the public API backward compatible for one release."
```

## Commands

- `list` - list configured repos
- `status [workflow]` - show health for every repo and optional saved session IDs for a workflow
- `impact <workflow> <prompt>` - create or reuse one session per repo and request structured impact analysis
- `prompt <repo> <workflow> <prompt>` - continue one repo's workflow session with a free-form prompt

## Public repo notes

- Commit `repos.example.json`, not `repos.json`
- Keep passwords in environment variables only
- `.fleet-state.json`, `node_modules/`, and `dist/` stay local and are ignored
