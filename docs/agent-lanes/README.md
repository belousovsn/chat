# Agent Lanes

This folder is for temporary coordinator-to-worker dialog files.

## Purpose

Use lane files when the coordinator needs to hand a specific issue, blocker, or review comment to one worker lane and wants a local file the worker can read and answer in.

These files are not permanent project docs.

## File Convention

- Active temp files: `lane-<lane>.md`
- Template: `TEMPLATE.md`

Examples:

- `lane-a.md`
- `lane-b.md`
- `lane-w2.md`

## Lifecycle

1. Coordinator creates `lane-<lane>.md`.
2. Worker reads that file and fixes or investigates the issue.
3. Worker appends a response in the worker reply section.
4. Coordinator reviews the response and either updates the file or closes the issue.
5. Coordinator deletes the file when the issue is over.

## Scope Rules

- Coordinator owns file creation and cleanup.
- Workers only touch the lane file assigned to them.
- Durable outcomes belong in task packets, the workboard, or other normal docs, not here.

The `.gitignore` file ignores `docs/agent-lanes/lane-*.md` so temporary lane files stay local and disposable.
