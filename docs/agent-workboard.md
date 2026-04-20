# Agent Workboard

Coordinator-owned file. Worker agents should read, not edit.

## Ready Now

### W1 Frontend Shell Split

- Priority: high
- Parallel safety: web-only
- Packet: `docs/agent-tasks/W1-frontend-shell-split.md`
- Goal: break `AppRoot.tsx` into route-safe, testable modules with no behavior change

### W2 Backend Conversation Hardening

- Priority: high
- Parallel safety: server-only
- Packet: `docs/agent-tasks/W2-backend-conversation-hardening.md`
- Goal: tighten room/direct-chat policy edge cases and reduce risk in service layer

### W3 Smoke Tests And Demo Flow

- Priority: high
- Parallel safety: docs/tests-only
- Packet: `docs/agent-tasks/W3-smoke-tests-and-demo-flow.md`
- Goal: add non-Docker smoke path and clear demo verification steps

## Ready After W1

### W4 Frontend Chat Polish

- Priority: medium
- Parallel safety: web-only
- Packet: `docs/agent-tasks/W4-frontend-chat-polish.md`
- Depends on: W1
- Goal: add cleaner boundaries for chat panes, modals, and query hooks

## Parked / Blocked

### W5 Docker Verification

- Priority: high later
- Packet: `docs/agent-tasks/W5-docker-verification.md`
- Blocker: requires separate machine with Docker available

## Suggested parallel assignment

- Agent A: W1
- Agent B: W2
- Agent C: W3

These three should not overlap if file ownership rules are respected.
