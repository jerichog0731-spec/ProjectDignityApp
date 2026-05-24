# Cursor Team Kit — Project Dignity

Team Kit ships skills, subagents, and rules for shipping and quality. Use slash commands in chat or let the agent pick skills automatically.

## When to use what

| Phase | Skill / command | Purpose |
|-------|-----------------|--------|
| **Now (harness)** | — | Rules in `.cursor/rules/` and this doc; no compile step yet |
| **After Step 1 scaffold** | `/check-compiler-errors` | Run `next build` / `tsc` and fix type errors |
| **Eligibility logic** | `/verify-this` | Prove 7/14/30/60-day rules match spec examples |
| **Before merge** | `/review-and-ship` | Review diff, tests, open or update PR |
| **CI failing** | `/fix-ci` or `/loop-on-ci` | Triage checks until green |
| **Status updates** | `/what-did-i-get-done` | Summarize your commits for a date range |
| **PR review** | Paste PR URL + `/pr-review-canvas` | Interactive walkthrough of the diff |

## Subagents

- **ci-watcher** — Poll PR checks; use while waiting on GitHub Actions.

## Rules (auto-applied with plugin)

- `no-inline-imports` — imports at top of file
- `typescript-exhaustive-switch` — exhaustive handling for unions/enums

## Recommended VS Code extensions

Listed in [.vscode/extensions.json](../.vscode/extensions.json). Install when prompted for ESLint, Tailwind, Prettier, and Playwright support.

## Deferred until scaffold

- `/check-compiler-errors` — no TypeScript project yet
- `/run-smoke-tests` — add Playwright after routes exist
- `/loop-on-ci` — add `.github/workflows` when CI is configured

## Next build step

Ask the agent: **"Run Step 1 scaffold from the spec"** (see [AGENTS.md](../AGENTS.md)).
