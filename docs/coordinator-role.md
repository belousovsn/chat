# Coordinator Role

Use this file when acting as coordinator across multiple worker lanes.

## Responsibilities

- Own task assignment, sequencing, and conflict avoidance.
- Keep the source of truth in `docs/agent-workboard.md`.
- Keep durable project history in `docs/progress-history.md`.
- Use lane dialog files for short-lived worker feedback, blockers, and fixes.

## Progress Reporting

When updating `docs/progress-history.md`:

- Keep raw timeline entries intact. Do not rewrite or delete them unless explicitly asked.
- Add human-readable report below raw timeline when outsider-readable status is useful.
- Default report style: short bullet list in caveman style.
- Keep report compact and constructive.

Use these six bullets in this order:

- Overall project status
- What's built
- W1 through W4 accomplished
- What verified
- What blocked
- What remains

Good pattern:

- Overall project status: app mostly built. Main code in good shape.
- What's built: auth, rooms, DMs, uploads, presence, moderation.
- W1 through W4: shell split, server harden, smoke/docs, frontend polish done.
- What verified: server check/build pass. web check/build pass.
- What blocked: Docker verify not done here. Smoke blocked without local PostgreSQL.
- What remains: root workflow cleanup. Docker verify. Final closeout.

## Lane Dialog Workflow

Lane dialog files are temporary coordinator-to-worker handoff notes.

- Location: `docs/agent-lanes/`
- Naming: `lane-<lane>.md`
- Examples:
  - `docs/agent-lanes/lane-a.md`
  - `docs/agent-lanes/lane-w2.md`

Use one active dialog file per lane. Reuse the same file while the issue is open instead of creating many small notes.

## When To Create A Lane Dialog

Create a lane dialog file when:

- a worker needs clarification on a bug or regression
- the coordinator has review findings or targeted fixes to hand off
- a worker is blocked and needs a scoped follow-up
- the coordinator wants the worker to report back in a durable local file

Do not use a lane dialog for normal task packets. Use it only for temporary issue handling layered on top of a packet.

## What Goes In A Lane Dialog

Each lane dialog should include:

- lane owner
- related task packet
- status
- problem summary
- concrete fix request
- file scope or constraints
- exact check to rerun if known
- response section for the worker

Use `docs/agent-lanes/TEMPLATE.md` as the starting shape.

## Coordinator Rules

- The coordinator creates and updates lane dialog files.
- The coordinator may ask a worker to append a reply in its lane dialog.
- The coordinator should point the worker at the exact file path.
- The coordinator should delete the lane dialog file after the issue is resolved or no longer relevant.
- If the issue becomes durable project context, move the final outcome into the task packet or workboard before deleting the lane dialog.

## Worker Rules

- A worker may read only the lane dialog assigned to it.
- A worker may append only inside the worker reply section of its assigned lane dialog unless told otherwise.
- A worker should not edit another lane's dialog file.
- A worker should treat the lane dialog as temporary instruction, not durable project history.

## Cleanup

When the issue is over:

1. Coordinator confirms the fix or unblock result.
2. Coordinator copies any durable outcome into the correct permanent doc if needed.
3. Coordinator deletes `docs/agent-lanes/lane-<lane>.md`.

Lane dialog files are intentionally git-ignored so they can be created, edited, and deleted freely during coordination.
