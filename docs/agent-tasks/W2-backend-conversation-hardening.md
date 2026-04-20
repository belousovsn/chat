Status: ready
Goal: Harden server rules around rooms, direct chats, bans, and message access with minimal surface changes.
Dependencies: none.
Required context: current server modules only.
Allowed files: `apps/server/src/modules/conversations/**`, `apps/server/src/modules/messages/**`, `apps/server/src/modules/uploads/**`, `apps/server/src/lib/**`, `apps/server/src/db/**`, `packages/shared/src/**` only if contract shape must change.
Do not edit: `apps/web/**`, `docs/progress-history.md`, `docs/agent-workboard.md`.
Start here:
- `apps/server/src/modules/conversations/service.ts`
- `apps/server/src/modules/messages/service.ts`
- `apps/server/src/modules/uploads/service.ts`
- `apps/server/src/db/schema.ts`
Focus:
- verify direct-chat friendship/block rules
- verify room owner/admin/member permission edges
- verify remove-member-as-ban behavior
- verify message edit/delete access checks
- verify attachment download access after membership loss
- reduce overly broad raw SQL if easy and safe
Acceptance checks:
- `corepack pnpm --filter @chat/server check`
- `corepack pnpm --filter @chat/server build`
- add or document at least one reproducible edge case fixed
Notes:
- Prefer narrow safety fixes over broad refactor.
- If API contract changes, keep web impact minimal and document it in task result.
