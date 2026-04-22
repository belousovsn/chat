# Codex Handoff

## Repo State

- Workspace: `C:\Users\ser\Documents\Projects(apps)\DA hackaton\chat`
- Current branch when this handoff was written: `codex/dev` tracking `origin/codex/dev`
- Important: working tree was already dirty before this handoff. Do not overwrite or revert unrelated local edits.

Observed local changes at handoff time:

- Modified:
  - `apps/server/src/modules/conversations/service.ts`
  - `apps/server/src/modules/messages/routes.ts`
  - `apps/server/src/modules/messages/service.ts`
  - `apps/server/src/modules/presence/service.ts`
  - `apps/web/src/app/dashboard/ChatPanel.tsx`
  - `apps/web/src/app/dashboard/ConversationSidebar.tsx`
  - `apps/web/src/app/dashboard/Dashboard.tsx`
  - `apps/web/src/app/dashboard/InfoSidebar.tsx`
  - `apps/web/src/app/dashboard/RoomModals.tsx`
  - `apps/web/src/app/dashboard/hooks/useDashboardRealtime.ts`
  - `apps/web/src/styles/global.css`
  - `packages/shared/src/contracts/http/chat.ts`
  - `packages/shared/src/contracts/socket/events.ts`
- Untracked:
  - `qa-server-8081.err.log`
  - `qa-server-8081.out.log`
  - `test-results/`

## What Already Exists

This repo is already a mostly complete classic chat MVP.

From `README.md` and `docs/progress-history.md`, current implemented scope includes:

- email/password auth
- sessions
- public/private rooms
- direct chats
- contacts/friends and blocking
- presence
- persistent messages
- uploads
- moderation
- smoke/docs/test coverage

High-level project status at handoff:

- app is close to ship for base assignment
- root/server/web checks and builds were previously reported passing
- Docker verification is still called out as pending on a proper machine
- Jabber/XMPP support is not implemented yet

## Files To Read First

1. `README.md`
2. `docs/progress-history.md`
3. the requirements markdown file in the repo root

Focus in requirements file:

- base app requirements: whole document at repo root
- advanced Jabber/XMPP section: lines around `285-296`

## Jabber/XMPP Requirement Summary

Chapter 6 in the root requirements markdown file is advanced/optional. It says that if base requirements are done quickly, add Jabber protocol support:

- users can connect using a Jabber/XMPP client
- servers should support federation between servers
- use a Jabber/XMPP library for the stack
- most advanced version includes a 2-server load/federation test with 50+ clients on each side
- add admin UI screens for:
  - connection dashboard
  - federation traffic/statistics

Important interpretation from discussion with user:

- this does not need to be a separate polished product
- simple admin screens inside existing web app are acceptable
- practical/basic visibility is enough: status, connections, federation peers, counters, recent events

## Current Jabber/XMPP Status

Search at handoff time found no Jabber/XMPP code in repo yet. Only the requirements file mentions it.

That means next agent should assume:

- no existing XMPP library integration
- no XMPP server sidecar yet
- no Jabber admin UI yet
- no federation config yet

## Infra Notes From User

User said:

- they own a DigitalOcean droplet
- they own a domain managed on Cloudflare
- another PC has working SSH access to the droplet

Why this helps:

- real public host/domain makes XMPP identity and federation testing much easier
- Cloudflare DNS can hold XMPP-related DNS records
- public droplet can host one or more XMPP endpoints for real integration tests

Practical note for XMPP networking:

- use Cloudflare primarily as DNS for XMPP hostnames
- expect XMPP hostnames to be DNS-only, not normal proxied web traffic
- XMPP may need SRV records and direct port reachability

## SSH Note

On this machine, SSH reachability to `167.71.53.253` was tested.

Results:

- server answered on port 22
- local key `C:\Users\ser\.ssh\id_ed25519` was offered
- auth failed for `ser`, `root`, and `ubuntu`
- another PC reportedly does have SSH access

Do not ask user to paste private keys into chat.

## Suggested Implementation Strategy

Recommended order:

1. Preserve and understand current dirty worktree before touching anything.
2. Confirm whether Jabber/XMPP should be attempted now or only after final base verification.
3. Start with minimal practical XMPP support, not full federation first.
4. Add simple admin UI screens inside existing web app.
5. Only after single-server path works, decide whether to add federation and load test.

Practical minimal target:

- allow at least some external XMPP/Jabber client connectivity
- support enough auth/message/presence flow to count as real integration
- expose basic admin visibility for XMPP status and connections
- document DNS/server setup clearly

Important architectural decision to make early:

- decide whether to embed XMPP behavior in current Node stack
- or integrate an existing XMPP server as sidecar/service and bridge to app data

The requirements note already hints this is likely more integration work than pure coding.

## First Actions For Next Agent

1. Run `git status --short --branch` and inspect local diffs before editing.
2. Read `README.md`, `docs/progress-history.md`, and the Jabber chapter in the root requirements markdown file.
3. Search repo for any newly added XMPP work if branch has moved since this handoff.
4. Inspect current backend/web architecture to decide where Jabber integration fits best.
5. If on the other PC with SSH access, verify droplet access first and record:
   - SSH username
   - target domain/subdomains
   - whether one or two public hosts will be used
6. Propose a minimal XMPP plan before large edits.

## Good Deliverable Shape

If moving forward on Jabber/XMPP, aim for:

- one clear design decision
- one small implementation slice
- one verification path
- one short ops/setup doc

Avoid trying to solve full 2-server federation, load testing, and polished dashboards all at once.
