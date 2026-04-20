Status: ready
Goal: Reduce merge noise and closeout friction before commit/PR without changing shipped behavior.
Dependencies: current W1-W4 follow-up work already landed in working tree.
Required context: repo root, generated-output policy, and current git diff.
Allowed files: repo root docs/config, generated output under `apps/web/dist-types/**`, `.gitignore`, and narrow build tooling/docs files as needed.
Do not edit: feature behavior in `apps/server/src/**` or `apps/web/src/**` unless a hygiene fix truly requires it.
Start here:
- `.gitignore`
- `package.json`
- `apps/web/dist-types/**`
- `docs/agent-workboard.md`
- `docs/agent-start-here.md`
- `git status --short`
Focus:
- decide whether generated `apps/web/dist-types/**` should remain tracked, be regenerated, or be ignored
- clean obviously stale coordination artifacts if they are no longer needed
- make docs accurately reflect current workflow and remaining gaps
- reduce avoidable diff noise without deleting useful build outputs blindly
Acceptance checks:
- `git status --short` is easier to read after the cleanup
- any generated-output decision is documented in code or docs, not implicit
- if tooling/config changed, rerun relevant lightweight check (`corepack pnpm check` if touched)
Notes:
- Do not use destructive git commands.
- If the repo intentionally tracks generated files, normalize them rather than removing them.
