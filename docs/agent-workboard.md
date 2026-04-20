# Agent Workboard

Coordinator-owned file. Worker agents should read, not edit.

## Coordinator Ops

- Use `docs/coordinator-role.md` for coordination rules.
- Use `docs/agent-lanes/lane-<lane>.md` for temporary lane-scoped issue handoff and worker replies.
- Delete lane dialog files after the issue is resolved.

## In Progress

- No active implementation lanes right now.

## Ready Now

- W5 Docker verification
  - Packet: `docs/agent-tasks/W5-docker-verification.md`
  - Scope: Docker-capable machine only
- W6 backend regression tests
  - Packet: `docs/agent-tasks/W6-backend-regression-tests.md`
  - Scope: server/tests only
- W7 manual QA and demo pass
  - Packet: `docs/agent-tasks/W7-manual-qa-demo-pass.md`
  - Scope: verification-first, small local fixes only
- W8 repo hygiene and closeout
  - Packet: `docs/agent-tasks/W8-repo-hygiene-and-closeout.md`
  - Scope: docs/config/generated-output only

## Completed

### W1 Frontend Shell Split

- Priority: high
- Parallel safety: web-only
- Packet: `docs/agent-tasks/W1-frontend-shell-split.md`
- Result: `AppRoot.tsx` split into auth gate, dashboard shell, sidebars, chat panel, and room modal modules with route behavior preserved

### W2 Backend Conversation Hardening

- Priority: high
- Parallel safety: server-only
- Packet: `docs/agent-tasks/W2-backend-conversation-hardening.md`
- Result: room admin/ban policy tightened, reply/read pointer checks added, upload/download access hardened, and server check/build passed

### W3 Smoke Tests And Demo Flow

- Priority: high
- Parallel safety: docs/tests-only
- Packet: `docs/agent-tasks/W3-smoke-tests-and-demo-flow.md`
- Result: non-Docker smoke path documented, `@chat/server smoke` added, onboarding docs updated, and local PostgreSQL dependency called out explicitly

### W4 Frontend Chat Polish

- Priority: medium
- Parallel safety: web-only
- Packet: `docs/agent-tasks/W4-frontend-chat-polish.md`
- Result: dashboard query/realtime/modal concerns split into dedicated hooks/components, `Dashboard.tsx` kept compact, and web check/build passed

## Parked / Blocked

- None beyond environment-specific blockers inside packet scopes.

## Suggested parallel assignment

- Next likely mix:
  - W6 and W8 together
  - W7 after runnable app confirmed
  - W5 only on machine with Docker available
