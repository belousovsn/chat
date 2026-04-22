# Future Plan

This document tracks practical post-deploy work for the current production setup on `chat.memdecks.com`.

Current baseline:

- single Ubuntu droplet
- app deployed behind `nginx`
- Docker Compose running app and Postgres
- HTTPS live on `chat.memdecks.com`
- Mailpit still used for password reset email capture

## Immediate Production Follow-Ups

These items should happen first because they affect real users and day-2 operations.

- Replace Mailpit with a real SMTP provider so password resets and account emails reach users.
- Create one production admin account and verify the moderation and session-management flows on the live site.
- Run a full user smoke pass on `chat.memdecks.com`: registration, login, room join/create, DM, attachment upload, logout, and password reset.
- Document the exact deploy and rollback steps used on the droplet so the app can be updated safely without rediscovering the process.
- Confirm upload storage location, current free disk, and expected retention so attachments do not silently fill the box.
- Add a staging or local production-like env file checklist to reduce config drift before future releases.

## Operational Hardening

These tasks reduce the risk of outages, data loss, and security problems.

- Add automated PostgreSQL backups with restore instructions and a real restore test.
- Add file backup coverage for uploaded attachments, not just the database.
- Add basic monitoring and alerts for container health, disk usage, memory, TLS expiry, and HTTP health checks.
- Rotate production secrets after the initial deploy cycle and move long-lived secrets into a clearer management path.
- Review firewall rules so only required ports stay open. Keep SSH locked down and avoid routine `root` app operations.
- Create a dedicated deploy user and move routine app updates away from manual `root` workflows.
- Enable log rotation and define where app, `nginx`, and container logs should be inspected during incidents.
- Schedule OS package updates and dependency refreshes with a simple monthly maintenance routine.
- Add swap-aware capacity checks and decide whether the droplet should be resized before higher traffic or XMPP work begins.

## Jabber / XMPP Next Steps

Thin-slice XMPP assets now exist in repo using `ejabberd` as a separate service. See [docs/xmpp-thin-slice.md](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/docs/xmpp-thin-slice.md).

- Verify real external client login and message exchange against the public hostname.
- Choose the public XMPP hostname. Recommended: `xmpp.memdecks.com`.
- Add DNS for that host and keep the record DNS-only if direct TCP access is needed.
- Reserve and document `5222` for client connections.
- Reserve and document `5269` for server-to-server federation later.
- Reserve and document `5443` for admin or HTTPS endpoints if exposed.
- Decide how accounts map between the app and XMPP. Current thin slice uses separate XMPP credentials for test users.
- Plan shared auth later through external auth or app-managed provisioning if the thin slice succeeds.
- Define the first acceptance test: create a user, log into a real XMPP client, exchange messages between two test accounts, and confirm the web app still works unchanged.
- After basic login works, decide whether to integrate XMPP presence, roster sync, or message bridging with the web app. Those should be separate milestones, not part of the first slice.
- Leave cross-server federation, admin dashboards, and load testing until after the single-server path is stable.

## Suggested Order

1. Finish immediate production follow-ups, especially real SMTP and backup coverage.
2. Harden operations enough that restores, monitoring, and routine deploys are predictable.
3. Enable the existing `ejabberd` thin slice on the droplet and test with real Jabber clients.
4. Only after that, design deeper integration with the web chat app.
