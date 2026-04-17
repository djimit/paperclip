---
name: paperclip-dev
required: false
description: >
  Develop and operate a local Paperclip instance — start and stop servers,
  pull updates from master, run builds and tests, manage worktrees, back up
  databases, and diagnose problems. Use whenever you need to work on the
  Paperclip codebase itself or keep a running instance healthy.
---

# Paperclip Dev

This skill covers the day-to-day workflows for developing and operating a local Paperclip instance. It assumes the repo lives at `~/workspace/paperclip` (or the current checkout) with `origin` pointing to `git@github.com:paperclipai/paperclip.git`.

## Starting and Stopping the Server

### Quick start (recommended)

```bash
npx paperclipai run
```

Runs onboarding (if first time), doctor checks, and then starts the Paperclip server. This is the single command that gets everything running.

**Options:**

| Flag | Description |
|------|-------------|
| `-c, --config <path>` | Path to config file |
| `-d, --data-dir <path>` | Paperclip data directory root (isolates state from `~/.paperclip`) |
| `-i, --instance <id>` | Local instance id (default: `default`) |
| `--bind <mode>` | Reachability preset: `loopback`, `lan`, or `tailnet` |
| `--repair` / `--no-repair` | Attempt automatic repairs during doctor (default: true) |

### Development mode (hot reload)

```bash
pnpm dev          # watches for changes and restarts
pnpm dev:once     # single dev run without watch
pnpm dev:server   # server only (no agent processes)
pnpm dev:ui       # UI dev server only
```

### Stopping

```bash
pnpm dev:stop     # stop the dev service
pnpm dev:list     # list running dev services
```

## Pulling from Master

```bash
cd ~/workspace/paperclip
git fetch origin
git pull origin master       # or merge/rebase as appropriate
pnpm install                # pick up dependency changes
pnpm build                  # rebuild all packages
```

After pulling, if schema changes landed:

```bash
pnpm db:generate            # regenerate Drizzle client from schema
pnpm db:migrate             # run pending migrations
```

## Building and Testing

```bash
pnpm build                  # full monorepo build
pnpm typecheck              # type-check all packages
pnpm test                   # run all tests (vitest)
pnpm test:watch             # run tests in watch mode
```

## Database Operations

### Migrations

```bash
pnpm db:generate            # generate Drizzle client from schema changes
pnpm db:migrate             # apply pending migrations
```

### Backups

```bash
npx paperclipai db:backup
```

**Options:**

| Flag | Description |
|------|-------------|
| `-c, --config <path>` | Path to config file |
| `-d, --data-dir <path>` | Paperclip data directory root |
| `--dir <path>` | Backup output directory (overrides config) |
| `--retention-days <days>` | Retention window for pruning old backups |
| `--filename-prefix <prefix>` | Backup filename prefix (default: `paperclip`) |
| `--json` | Print backup metadata as JSON |

## Diagnostics

```bash
npx paperclipai doctor              # check setup health
npx paperclipai doctor --repair     # check and auto-fix issues
npx paperclipai env                 # print current environment variables
```

## Agent Operations (Local)

### Trigger a heartbeat

```bash
npx paperclipai heartbeat run --agent-id <agent-id>
```

### Install skills and get agent env vars

```bash
npx paperclipai agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

Installs Paperclip skills for Claude/Codex and prints shell exports for that agent identity.

### List agents

```bash
npx paperclipai agent list --company-id <company-id>
```

---

## Worktrees

Paperclip worktrees combine git worktrees with isolated Paperclip instances. Each worktree gets its own database, server port, and full Paperclip environment seeded from the primary instance.

### When to Use Worktrees

- Starting a feature branch that needs its own Paperclip environment
- Running parallel agent work without cross-contaminating the primary instance
- Testing Paperclip changes in isolation before merging
- Cleaning up after a completed branch

### Commands

All commands use `npx paperclipai`. The CLI has two tiers:

1. **Top-level shortcuts** (`worktree:make`, `worktree:list`, `worktree:cleanup`, `worktree:merge-history`) -- end-to-end lifecycle commands
2. **Subcommands** (`worktree init`, `worktree env`, `worktree reseed`, `worktree repair`) -- lower-level instance management within an existing worktree

---

### Create a Worktree

```bash
npx paperclipai worktree:make <name>
```

Creates `~/paperclip-<name>` as a git worktree with a new branch, then bootstraps an isolated Paperclip instance inside it. The name is auto-prefixed with `paperclip-` if needed.

**Options:**

| Flag | Description |
|------|-------------|
| `--start-point <ref>` | Remote ref to base the new branch on (env: `PAPERCLIP_WORKTREE_START_POINT`) |
| `--instance <id>` | Explicit isolated instance id |
| `--home <path>` | Home root for worktree instances (env: `PAPERCLIP_WORKTREES_DIR`, default: `~/.paperclip-worktrees`) |
| `--from-config <path>` | Source config.json to seed from |
| `--from-data-dir <path>` | Source `PAPERCLIP_HOME` used when deriving the source config |
| `--from-instance <id>` | Source instance id (default: `default`) |
| `--server-port <port>` | Preferred server port |
| `--db-port <port>` | Preferred embedded Postgres port |
| `--seed-mode <mode>` | `minimal` or `full` (default: `minimal`) |
| `--no-seed` | Skip database seeding from the source instance |
| `--force` | Replace existing repo-local config and isolated instance data |

**Example -- start a feature worktree based on main:**

```bash
npx paperclipai worktree:make auth-refactor --start-point origin/main
```

---

### List Worktrees

```bash
npx paperclipai worktree:list
```

Lists all git worktrees visible from the current repo and indicates which ones have a Paperclip instance configured.

| Flag | Description |
|------|-------------|
| `--json` | Print JSON output instead of text |

---

### Initialize a Worktree Instance (Low-Level)

```bash
npx paperclipai worktree init
```

Run this inside an existing git worktree to create repo-local config/env and bootstrap an isolated Paperclip instance. This is the lower-level equivalent of what `worktree:make` does automatically.

**Options:**

| Flag | Description |
|------|-------------|
| `--name <name>` | Display name used to derive the instance id |
| `--instance <id>` | Explicit isolated instance id |
| `--home <path>` | Home root (env: `PAPERCLIP_WORKTREES_DIR`, default: `~/.paperclip-worktrees`) |
| `--from-config <path>` | Source config.json to seed from |
| `--from-data-dir <path>` | Source `PAPERCLIP_HOME` for deriving config |
| `--from-instance <id>` | Source instance id (default: `default`) |
| `--server-port <port>` | Preferred server port |
| `--db-port <port>` | Preferred embedded Postgres port |
| `--seed-mode <mode>` | `minimal` or `full` (default: `minimal`) |
| `--no-seed` | Skip database seeding |
| `--force` | Replace existing config and instance data |

---

### Print Worktree Environment

```bash
npx paperclipai worktree env
```

Prints shell exports (`PAPERCLIP_API_URL`, `PAPERCLIP_HOME`, etc.) for the current worktree-local instance.

| Flag | Description |
|------|-------------|
| `-c, --config <path>` | Path to config file |
| `--json` | Print JSON instead of shell exports |

**Example -- source the environment in your shell:**

```bash
eval "$(npx paperclipai worktree env)"
```

---

### Reseed a Worktree

```bash
npx paperclipai worktree reseed
```

Re-seeds an existing worktree-local instance from another Paperclip instance. Use this to refresh a stale worktree with current data.

**Options:**

| Flag | Description |
|------|-------------|
| `--from <worktree>` | Source worktree path, directory name, branch name, or `current` |
| `--to <worktree>` | Target worktree (defaults to `current`) |
| `--from-config <path>` | Source config.json |
| `--from-data-dir <path>` | Source `PAPERCLIP_HOME` |
| `--from-instance <id>` | Source instance id |
| `--seed-mode <mode>` | `minimal` or `full` (default: `full`) |
| `--yes` | Skip the destructive confirmation prompt |
| `--allow-live-target` | Override the guard requiring the target DB to be stopped |

**Important:** Stop the target worktree's database before reseeding unless using `--allow-live-target`.

---

### Repair a Worktree Instance

```bash
npx paperclipai worktree repair
```

Creates or repairs a linked worktree-local Paperclip instance without touching the primary checkout.

**Options:**

| Flag | Description |
|------|-------------|
| `--branch <name>` | Branch/worktree selector to repair |
| `--home <path>` | Home root (env: `PAPERCLIP_WORKTREES_DIR`, default: `~/.paperclip-worktrees`) |
| `--from-config <path>` | Source config.json |
| `--from-data-dir <path>` | Source `PAPERCLIP_HOME` |
| `--from-instance <id>` | Source instance id (default: `default`) |
| `--seed-mode <mode>` | `minimal` or `full` (default: `minimal`) |
| `--no-seed` | Repair metadata only, skip reseeding |
| `--allow-live-target` | Override the stopped-DB guard |

---

### Merge Issue History Between Worktrees

```bash
npx paperclipai worktree:merge-history [source]
```

Previews or imports issue and comment history from one worktree's Paperclip instance into another.

**Options:**

| Flag | Description |
|------|-------------|
| `--from <worktree>` | Source worktree path, directory name, branch name, or `current` |
| `--to <worktree>` | Target worktree (defaults to `current`) |
| `--company <id-or-prefix>` | Shared company id or issue prefix |
| `--scope <items>` | Comma-separated: `issues`, `comments` (default: `issues,comments`) |
| `--apply` | Apply the import after preview |
| `--dry` | Preview only |
| `--yes` | Skip interactive confirmation |

---

### Clean Up a Worktree

```bash
npx paperclipai worktree:cleanup <name>
```

Removes a worktree, its git branch, and its isolated Paperclip instance data. The name is auto-prefixed with `paperclip-` if needed.

| Flag | Description |
|------|-------------|
| `--instance <id>` | Explicit instance id (if different from the worktree name) |
| `--home <path>` | Home root (env: `PAPERCLIP_WORKTREES_DIR`, default: `~/.paperclip-worktrees`) |
| `--force` | Bypass safety checks (uncommitted changes, unique commits) |

**Safety:** Without `--force`, the command checks for uncommitted changes and unique (unmerged) commits before removing. Always merge or push important work before cleanup.

---

### Typical Worktree Workflow

```bash
# 1. Create a worktree for a feature
npx paperclipai worktree:make my-feature --start-point origin/main

# 2. Move into it
cd ~/paperclip-my-feature

# 3. Source the Paperclip environment
eval "$(npx paperclipai worktree env)"

# 4. Start the isolated Paperclip server
npx paperclipai run

# 5. Do your work -- agents use the isolated instance

# 6. When done, merge history back if needed
npx paperclipai worktree:merge-history --from paperclip-my-feature --to current --apply

# 7. Clean up
npx paperclipai worktree:cleanup my-feature
```

## Key Concepts

- **Instance isolation:** Each worktree gets its own database, server port, and config. Agents in one worktree don't interfere with another.
- **Seeding:** New worktrees are seeded from an existing instance. `minimal` copies config (company, agents, skills). `full` copies everything including issues.
- **Home directory:** Worktree instance data lives under `~/.paperclip-worktrees/` by default (configurable via `PAPERCLIP_WORKTREES_DIR`).
- **History merging:** Issue and comment history can be selectively merged between worktrees before cleanup.

## Pull Requests

> **MANDATORY PRE-FLIGHT:** Before creating ANY pull request, you MUST read the canonical source files listed below. Do NOT run `gh pr create` until you have read these files and verified your PR body matches every required section.

### Step 1 — Read the canonical files

You MUST read all three of these files before creating a PR:

1. **`.github/PULL_REQUEST_TEMPLATE.md`** — the required PR body structure
2. **`CONTRIBUTING.md`** — contribution conventions, PR requirements, and thinking-path examples
3. **`.github/workflows/pr.yml`** — CI checks that gate merge

### Step 2 — Validate your PR body against this checklist

After reading the template, verify your `--body` includes every one of these sections (names must match exactly):

- [ ] `## Thinking Path` — blockquote style, 5-8 reasoning steps
- [ ] `## What Changed` — bullet list of concrete changes
- [ ] `## Verification` — how a reviewer confirms this works
- [ ] `## Risks` — what could go wrong
- [ ] `## Model Used` — provider, model ID, version, capabilities
- [ ] `## Checklist` — copied from the template, items checked off

If any section is missing or empty, do NOT submit the PR. Go back and fill it in.

### Step 3 — Create the PR

Only after completing Steps 1 and 2, run `gh pr create`. Use the template contents as the structure for `--body` — do not write a freeform summary.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Server won't start | Run `npx paperclipai doctor --repair` to diagnose and auto-fix |
| Forgetting to source worktree env | Run `eval "$(npx paperclipai worktree env)"` after cd-ing into the worktree |
| Stale dependencies after pull | Run `pnpm install && pnpm build` after pulling |
| Schema out of date after pull | Run `pnpm db:generate && pnpm db:migrate` |
| Reseeding while target DB is running | Stop the target server first, or use `--allow-live-target` |
| Cleaning up with unmerged commits | Merge or push first, or use `--force` if intentionally discarding |
| Running agents against wrong instance | Verify `PAPERCLIP_API_URL` points to the correct port |
