Status: ready
Goal: Split `apps/web/src/app/AppRoot.tsx` into smaller modules without changing behavior or routes.
Dependencies: none.
Required context: current repo state only, no Docker work.
Allowed files: `apps/web/src/**`, optionally `packages/shared/src/**` only if a type export is missing.
Do not edit: `apps/server/**`, `docs/progress-history.md`, `docs/agent-workboard.md`.
Start here:
- `apps/web/src/app/AppRoot.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/features/chat/store.ts`
Expected split:
- auth gate / auth forms
- dashboard shell
- chat panel
- sidebars
- manage-room modal
- shared query helpers or hooks if needed
Acceptance checks:
- `corepack pnpm --filter @chat/web check`
- `corepack pnpm --filter @chat/web build`
- behavior preserved: login/register/reset forms still render, chat shell still loads, manage-room modal still works
Notes:
- Keep routes same.
- Prefer moving code, not redesigning UI.
- Main success metric is smaller files and cleaner ownership for future UI agents.
