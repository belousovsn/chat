Status: ready
Goal: Run a human-style manual QA and demo pass across newly wired UI actions, then document exact outcomes and gaps.
Dependencies: app must be runnable locally either through existing non-Docker flow or Docker on another machine.
Required context: `README.md`, current web dashboard flows, and demo accounts.
Allowed files: `README.md`, `docs/**`, and tiny UI/docs fixes only if a clear bug is found during QA and the fix is local and obvious.
Do not edit: broad backend internals or broad refactors. This packet is primarily verification and notes.
Start here:
- `README.md`
- `apps/web/src/app/dashboard/Dashboard.tsx`
- `apps/web/src/app/dashboard/ChatPanel.tsx`
- `apps/web/src/app/dashboard/ConversationSidebar.tsx`
- `apps/web/src/app/dashboard/InfoSidebar.tsx`
- `docs/progress-history.md` (read-only unless coordinator later asks you to write summary there)
Focus:
- verify sign-in with demo accounts
- verify message send, edit, and delete flows
- verify leave-room flow
- verify remove-friend and block-user flows
- verify change-password flow
- verify delete-account flow only if safe to do on disposable seeded/demo account
- capture exact repro steps, expected result, actual result, and whether each step passed
Acceptance checks:
- produce a concise pass/fail matrix in your return message
- if a bug is found and you fix it, rerun the affected step and report before/after
- if environment blocks QA, report exact blocker and the farthest successful step reached
Notes:
- Prefer using seeded/demo users and disposable data.
- Do not improvise large fixes. If a bug is non-trivial, stop with a crisp repro and impact note.
