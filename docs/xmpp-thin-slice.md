# XMPP Thin Slice

This repo now includes a first Jabber/XMPP thin slice built around `ejabberd`.

What this slice covers:

- optional `ejabberd` service assets for Docker Compose
- app-side XMPP dashboard endpoint at `/api/xmpp/status`
- web admin panel for connection and federation counters
- helper script to register test users in the running XMPP service

What this slice does not cover yet:

- message bridging between web chat and XMPP
- two-server federation verification
- load test with 50+ clients per side

Shared auth status:

- new app registrations can now provision matching XMPP accounts when `XMPP_USER_PROVISIONING_ENABLED=true`
- app password changes and reset-password flow can sync the XMPP password too
- account deletion can unregister the XMPP account
- existing users created before that flag was enabled still need a repair/provision step because the app stores password hashes, not plaintext passwords

## Local Run

Start the base stack plus XMPP:

```bash
docker compose --profile xmpp up --build
```

Then create two test XMPP accounts:

```bash
./ops/scripts/xmpp-register-user.sh alice localhost replace-me
./ops/scripts/xmpp-register-user.sh bob localhost replace-me
./ops/scripts/xmpp-link-users.sh alice bob localhost
```

Thin-slice local defaults:

- XMPP domain: `localhost`
- client host: `localhost`
- client port: `5222`
- admin UI: `http://localhost:5443/admin`
- API endpoint used by the app: `http://xmpp:5281/api`

Use a Jabber client against `localhost:5222`, log in as `alice@localhost`, and confirm:

1. client connects successfully
2. `alice` can message `bob`
3. web app settings menu shows Jabber dashboard for configured admin users

## Production Shape

Production compose includes the same XMPP service behind the `xmpp` profile so the live app does not start it accidentally.

Enable it on the server:

```bash
sudo ./ops/scripts/refresh-xmpp-certs.sh xmpp.chat.example.com
docker compose --env-file .env.production -f docker-compose.prod.yml --profile xmpp up -d xmpp
COMPOSE_ENV_FILE=.env.production COMPOSE_FILE=docker-compose.prod.yml ./ops/scripts/xmpp-register-user.sh alice xmpp.chat.example.com replace-me
COMPOSE_ENV_FILE=.env.production COMPOSE_FILE=docker-compose.prod.yml ./ops/scripts/xmpp-link-users.sh alice bob xmpp.chat.example.com
```

Recommended production DNS and ports:

- `xmpp.<your-domain>` as DNS-only hostname
- `5222` for client c2s
- `5269` reserved for federation later
- `5443` local-only admin HTTP endpoint unless you deliberately expose and protect it

Production TLS note:

- `docker-compose.prod.yml` expects readable PEM copies at `/srv/chat/certs/xmpp/fullchain.pem` and `/srv/chat/certs/xmpp/privkey.pem`
- refresh them after cert issuance or renewal with [ops/scripts/refresh-xmpp-certs.sh](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/scripts/refresh-xmpp-certs.sh)
- Gajim and similar clients may also probe `https://xmpp.<your-domain>/.well-known/host-meta`, so install [ops/nginx/xmpp.memdecks.com.conf](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/nginx/xmpp.memdecks.com.conf) or equivalent for the XMPP hostname with the correct TLS certificate
- to let the app provision and repair XMPP users, enable `XMPP_USER_PROVISIONING_ENABLED=true`

## App Dashboard

The web app exposes a Jabber admin window for usernames listed in `XMPP_ADMIN_USERS`.

Current production usernames with dashboard access:

- `kinzul`
- `da_test`

Current dashboard fields:

- connected user count
- incoming federation session count
- outgoing federation session count
- sample connected sessions
- compose/profile and client setup commands
- warning state if API credentials or service are missing

## Windows Quick Connect

Use the dedicated Windows note for exact client fields and troubleshooting:

- [docs/xmpp-windows-connect.md](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/docs/xmpp-windows-connect.md)

Current production behavior:

- production uses a valid Let's Encrypt certificate for `xmpp.memdecks.com`
- client connections should use STARTTLS on `5222`
- HTTPS discovery on `xmpp.memdecks.com` should also present the `xmpp.memdecks.com` certificate
- presence status between test accounts requires roster subscription; use `xmpp-link-users.sh` or accept presence requests in the client
- app friendship accept/remove/block flows can sync XMPP roster links when app-managed provisioning is enabled
- use the demo credentials only for connection testing

Web app note:

- if you sign into the chat web UI as `kinzul` or `da_test`, the Settings window can show the Jabber dashboard because those usernames are already present in `XMPP_ADMIN_USERS`

## Next Milestones

1. Enable app-managed provisioning in production env and test with a fresh or repaired app account.
2. Decide whether to require strict XMPP sync failures to block app auth flows.
3. Add real federation peer test on `5269`.
4. Add message bridging only after client login is stable.
