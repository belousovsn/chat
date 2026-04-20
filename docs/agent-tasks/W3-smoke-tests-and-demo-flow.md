Status: ready
Goal: Add lightweight verification path and clearer demo flow without depending on Docker.
Dependencies: none.
Required context: repo root, server package, README.
Allowed files: `README.md`, `docs/**`, `apps/server/package.json`, `apps/server/src/db/seed.ts`, new test or script files under `apps/server/src/**` or `apps/server/scripts/**`.
Do not edit: `apps/web/src/app/AppRoot.tsx`, `apps/server/src/modules/conversations/**`, `docs/progress-history.md`, `docs/agent-workboard.md`.
Start here:
- `README.md`
- `apps/server/src/db/seed.ts`
- `apps/server/package.json`
- `docs/agent-start-here.md`
Focus:
- add one fast smoke path for seeded local verification
- make demo accounts and demo flow explicit
- add clear "Docker deferred" note instead of pretending it was verified here
- if practical, add server-side smoke test or script that checks health/seed assumptions
Acceptance checks:
- docs clearly tell fresh agent how to verify non-Docker flow
- any added script has exact command documented
- `corepack pnpm --filter @chat/server check`
Notes:
- This packet is docs/tests oriented. Keep out of main feature code paths.
