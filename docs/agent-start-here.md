# Agent Start Here

Use this file first. Do not read whole repo unless blocked.

## Current state

- Monorepo with `apps/server`, `apps/web`, `packages/shared`.
- Package-level compile status: `corepack pnpm --filter @chat/server check` and `build` pass; `corepack pnpm --filter @chat/web check` and `build` pass.
- Root workflow status: `corepack pnpm check`, `build`, and `test` now pass in this Windows shell.
- Docker path exists in repo but is intentionally deferred until separate machine is available.
- Non-Docker verification path now exists in `README.md`: set local server env, run `corepack pnpm --filter @chat/server migrate`, `seed`, then `smoke`.
- Biggest current code concentration:
  - frontend follow-up work now sits under `apps/web/src/app/dashboard/**` and `apps/web/src/lib/api.ts`.
  - `apps/server/src/modules/conversations/service.ts` holds much room/direct-chat policy.

## Multiagent rules

- Coordinator owns:
  - `docs/agent-workboard.md`
  - `docs/progress-history.md`
- Coordinator guidance lives in:
  - `docs/coordinator-role.md`
- Worker agents do not edit coordinator-owned files.
- Each worker edits only:
  - files listed in its assigned task packet
  - its own task packet status line if asked
- Temporary lane dialog files may exist under `docs/agent-lanes/`.
- If the coordinator points you to `docs/agent-lanes/lane-<lane>.md`, read it after your task packet and reply only in that file's worker reply section.
- Do not create lane dialog files yourself unless the coordinator explicitly asks.
- If task needs files outside allowed scope, stop and hand back blocker instead of expanding scope.
- Do not spend context reading unrelated modules.

## Minimal read order

1. Read this file.
2. Read assigned packet in `docs/agent-tasks/`.
3. Read assigned lane dialog file under `docs/agent-lanes/` if the coordinator referenced one.
4. Read only listed starting files from the packet and lane dialog.
5. Run only packet-specific checks if possible.

## Current priorities

1. Add deeper backend regression coverage for recent hardening.
2. Run manual QA on newly wired UI actions and demo flow.
3. Verify Docker path on proper machine and reduce repo closeout noise.

## Useful commands

- `corepack pnpm -r check`
- `corepack pnpm -r build`
- `corepack pnpm --filter @chat/server test`
- `corepack pnpm --filter @chat/server migrate`
- `corepack pnpm --filter @chat/server seed`
- `corepack pnpm --filter @chat/server smoke`

## Known local blocker

- `pnpm install` may pause on interactive module purge prompt.
- Safe rerun:
  - `corepack pnpm install --reporter=append-only --force --config.confirmModulesPurge=false`
- Local smoke flow requires PostgreSQL listening at `127.0.0.1:5432`. If absent, `corepack pnpm --filter @chat/server smoke` will fail before app-level checks.
