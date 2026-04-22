Status: completed - message edit/delete, leave room, remove friend/block user, and account security actions wired into existing UI; web check/build passed
Goal: Finish missing user-facing chat and account actions already supported by frontend API helpers.
Dependencies: current W1/W4 refactor is already landed in working tree.
Required context: current web app only.
Allowed files: `apps/web/src/**`, optionally `packages/shared/src/**` only if a type export is missing.
Do not edit: `apps/server/**`, `docs/progress-history.md`, `docs/agent-workboard.md`.
Start here:
- `apps/web/src/app/dashboard/ChatPanel.tsx`
- `apps/web/src/app/dashboard/InfoSidebar.tsx`
- `apps/web/src/app/dashboard/RoomModals.tsx`
- `apps/web/src/app/dashboard/Dashboard.tsx`
- `apps/web/src/lib/api.ts`
Focus:
- wire message edit and delete UI for author-owned messages
- wire leave-room flow for room conversations
- wire remove-friend and block-user actions in existing sidebars/panels
- wire account-security actions already exposed by API where practical: change password first, delete account only if UX can be made safe and explicit
- keep UI consistent with current style; no big redesign pass
Acceptance checks:
- `corepack pnpm --filter @chat/web check`
- `corepack pnpm --filter @chat/web build`
- actions appear only when user has permission
- failures surface in existing local status/error UI
- no new giant all-in-one file appears
Notes:
- Prefer small controls in existing panels/modals over introducing new routes.
- If a backend capability turns out missing or unsafe, stop and document exact blocker instead of faking partial UI.

Task result:
- `ChatPanel.tsx` now exposes leave-room plus author-only edit/delete actions.
- `ConversationSidebar.tsx` now exposes remove-friend and block-user actions for contacts.
- `InfoSidebar.tsx` now exposes change-password and explicit delete-account flows.
- `Dashboard.tsx` now wires these actions through existing status and query refresh paths.
- Checks:
  - `corepack pnpm --filter @chat/web check` passed
  - `corepack pnpm --filter @chat/web build` passed

Previous result kept for history:
- `AppRoot.tsx` reduced to auth/session gate.
- Auth flow moved to `apps/web/src/app/auth/AuthGate.tsx`.
- Dashboard split into `apps/web/src/app/dashboard/{Dashboard,ConversationSidebar,ChatPanel,InfoSidebar,RoomModals,types}.tsx`.
- Acceptance checks previously passed with local workaround: `COREPACK_INTEGRITY_KEYS=0 corepack pnpm --filter @chat/web check` and `build`.
