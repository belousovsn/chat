Status: completed - realtime membership sync added for leave/join/direct/block/friend changes, conversation delivery now targets currently eligible users only, server check/build passed
Goal: Harden realtime membership checks so users stop receiving room/direct updates as soon as access is lost.
Dependencies: none.
Required context: current server realtime and conversation access code only.
Allowed files: `apps/server/src/modules/presence/**`, `apps/server/src/modules/conversations/**`, `apps/server/src/modules/messages/**`, `apps/server/src/lib/**`, `packages/shared/src/**` only if event shape must change.
Do not edit: `apps/web/**`, `docs/progress-history.md`, `docs/agent-workboard.md`.
Start here:
- `apps/server/src/modules/presence/service.ts`
- `apps/server/src/modules/conversations/service.ts`
- `apps/server/src/modules/messages/service.ts`
- `packages/shared/src/contracts/socket/events.ts`
Focus:
- verify socket room joins only happen for conversations the user can still access
- ensure leave/ban/block/member-state changes remove access promptly for future events
- verify direct-chat access follows friendship/block rules, not only stale socket membership
- keep event surface stable unless a small contract tweak is clearly needed
Acceptance checks:
- `corepack pnpm --filter @chat/server check`
- `corepack pnpm --filter @chat/server build`
- document at least one concrete repro fixed, especially left/banned user receiving `message.created` or similar realtime updates
Notes:
- Prefer narrow correctness fixes over a broad realtime redesign.
- If full disconnect or room rejoin logic is needed, keep it local to realtime/policy modules.

Task result:
- `RealtimeService` now syncs socket conversation rooms from current accessible conversation ids instead of trusting stale membership alone.
- conversation and contact routes now call realtime membership sync after join/leave/direct creation/remove-friend/block/ban/unban changes.
- realtime message emits now await recipient filtering and deliver only to currently eligible users.
- direct-conversation access checks now re-verify friendship/block state before allowing list/realtime access.
- Repro fixed:
  - before, user could stay subscribed to room/direct updates after leave/ban/block/friend removal
  - after, membership sync removes stale room subscriptions and emit path targets only allowed user ids
- Checks:
  - `corepack pnpm --filter @chat/server check` passed
  - `corepack pnpm --filter @chat/server build` passed

Previous result kept for history:
- Added documented non-Docker verification flow in `README.md`, including demo accounts, manual demo order, and explicit Docker-deferred note.
- Added `corepack pnpm --filter @chat/server smoke` command in `apps/server/package.json`.
- Added `apps/server/src/scripts/smoke.ts` to verify seeded demo users, seeded `general` room, `GET /api/health`, and demo login.
- Updated onboarding docs so fresh agents can find the non-Docker smoke path without relying only on the README.
