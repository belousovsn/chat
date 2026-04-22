Status: completed - shared frontend payload types tightened, realtime hook uses typed socket events with narrower cache updates, web check/build passed
Goal: Tighten frontend data typing and realtime cache handling after shell split.
Dependencies: none.
Required context: current web modules plus shared contracts.
Allowed files: `apps/web/src/**`, `packages/shared/src/**` only if shared type exports or event payload types need cleanup.
Do not edit: `apps/server/**`, `docs/progress-history.md`, `docs/agent-workboard.md`.
Start here:
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/socket.ts`
- `apps/web/src/app/dashboard/hooks/useDashboardData.ts`
- `apps/web/src/app/dashboard/hooks/useDashboardRealtime.ts`
- `packages/shared/src/contracts/http/chat.ts`
- `packages/shared/src/contracts/socket/events.ts`
Focus:
- replace loose `Record<string, unknown>` frontend response shapes with concrete shared types
- make contact, request, public-room, and ban payloads typed end to end
- use shared socket event contracts in frontend realtime handling
- reduce brute-force invalidation where safe; prefer narrower query invalidation or direct cache patching
- keep behavior same unless a bug fix is needed for correctness
Acceptance checks:
- `corepack pnpm --filter @chat/web check`
- `corepack pnpm --filter @chat/web build`
- no `Record<string, unknown>` remains in `apps/web/src/lib/api.ts` for chat/domain payloads that already have a stable shape
- realtime updates still refresh message list, unread state, and presence
Notes:
- Keep this packet frontend-only unless a missing shared type export is the cleanest fix.
- Prefer contract cleanup over ad hoc local interfaces.

Task result:
- Typed shared payloads added for contacts, friend requests, public rooms, room bans, and room summary/detail realtime fields.
- `apps/web/src/lib/api.ts` no longer uses `Record<string, unknown>` for stable chat/domain payloads.
- `apps/web/src/lib/socket.ts` now uses shared Socket.IO event typings.
- `useDashboardRealtime()` now handles shared typed socket envelopes and narrows updates:
  - patch active message cache for create/update/delete
  - patch presence in contacts, conversation summaries/details, and visible messages
  - patch unread counts in conversation summaries
  - invalidate conversations/details only where still safer than patching
- Checks:
  - `corepack pnpm --filter @chat/web check` passed
  - `corepack pnpm --filter @chat/web build` passed

Previous result kept for history:
- Repro edge case fixed in prior backend hardening:
  - older-message edit fetch no longer fails with `404 Message not visible`
- Additional hardening already landed:
  - reply target must belong to same conversation and not be deleted
  - read cursor target must belong to same conversation and not be deleted
  - only room owner can grant admin
  - room admin cannot ban another admin or remove own admin role
  - attachment upload/download routes enforce auth and current conversation access
