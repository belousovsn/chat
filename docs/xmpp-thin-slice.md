# XMPP Thin Slice

This repo now includes a first Jabber/XMPP thin slice built around `ejabberd`.

What this slice covers:

- optional `ejabberd` service assets for Docker Compose
- app-side XMPP dashboard endpoint at `/api/xmpp/status`
- web admin panel for connection and federation counters
- helper script to register test users in the running XMPP service

What this slice does not cover yet:

- shared auth between chat users and XMPP users
- message bridging between web chat and XMPP
- two-server federation verification
- load test with 50+ clients per side

## Local Run

Start the base stack plus XMPP:

```bash
docker compose --profile xmpp up --build
```

Then create two test XMPP accounts:

```bash
./ops/scripts/xmpp-register-user.sh alice localhost replace-me
./ops/scripts/xmpp-register-user.sh bob localhost replace-me
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
```

Recommended production DNS and ports:

- `xmpp.<your-domain>` as DNS-only hostname
- `5222` for client c2s
- `5269` reserved for federation later
- `5443` local-only admin HTTP endpoint unless you deliberately expose and protect it

Production TLS note:

- `docker-compose.prod.yml` expects readable PEM copies at `/srv/chat/certs/xmpp/fullchain.pem` and `/srv/chat/certs/xmpp/privkey.pem`
- refresh them after cert issuance or renewal with [ops/scripts/refresh-xmpp-certs.sh](/C:/Users/sbelousov/Documents/Projects/DA_hackaton_chat/ops/scripts/refresh-xmpp-certs.sh)

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

Shortest path on Windows:

1. Install Gajim from `https://gajim.org/download/`.
2. Open Gajim and choose existing XMPP account.
3. Enter JID: `demoa@xmpp.memdecks.com`
4. Enter password: `TSAbLDf1jn_1mperAAJ7qR2b`
5. If client asks for manual host, use:
   - host: `xmpp.memdecks.com`
   - port: `5222`
6. Connect.

Expected behavior now:

- production now uses Let’s Encrypt certs for `xmpp.memdecks.com`
- client should prefer STARTTLS on `5222`
- use demo credentials only, not personal password

Second demo account for message tests:

- `demob@xmpp.memdecks.com`
- password: `SOh9FI1xTzokyUwvC8hirHn9`

Web app note:

- if you sign into the chat web UI as `kinzul` or `da_test`, the Settings window can show the Jabber dashboard because those usernames are already present in `XMPP_ADMIN_USERS`

## Next Milestones

1. Verify real external client login against `xmpp.memdecks.com`.
2. Lock down TLS and DNS records for XMPP hostnames.
3. Decide whether to provision XMPP users from the app or keep separate test users.
4. Add real federation peer test before attempting message bridging.
