# Agent Start Here

Use this file first. Do not read whole repo unless blocked.

## Current state

- Monorepo with `apps/server`, `apps/web`, `packages/shared`.
- Local compile status: `corepack pnpm -r check` passes, `corepack pnpm -r build` passes.
- Docker path exists in repo but is intentionally deferred until separate machine is available.
- Biggest current code concentration:
  - `apps/web/src/app/AppRoot.tsx` is large and should be split before more UI work.
  - `apps/server/src/modules/conversations/service.ts` holds much room/direct-chat policy.

## Multiagent rules

- Coordinator owns:
  - `docs/agent-workboard.md`
  - `docs/progress-history.md`
- Worker agents do not edit coordinator-owned files.
- Each worker edits only:
  - files listed in its assigned task packet
  - its own task packet status line if asked
- If task needs files outside allowed scope, stop and hand back blocker instead of expanding scope.
- Do not spend context reading unrelated modules.

## Minimal read order

1. Read this file.
2. Read assigned packet in `docs/agent-tasks/`.
3. Read only listed starting files from that packet.
4. Run only packet-specific checks if possible.

## Current priorities

1. Split web shell into smaller modules without behavior change.
2. Add backend/API smoke coverage and hardening around conversation/message rules.
3. Prepare Docker verification packet, but do not execute it yet on this machine.

## Useful commands

- `corepack pnpm -r check`
- `corepack pnpm -r build`
- `corepack pnpm --filter @chat/server test`

## Known local blocker

- `pnpm install` may pause on interactive module purge prompt.
- Safe rerun:
  - `corepack pnpm install --reporter=append-only --force --config.confirmModulesPurge=false`
