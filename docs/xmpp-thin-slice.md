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
docker compose --env-file .env.production -f docker-compose.prod.yml --profile xmpp up -d xmpp
COMPOSE_ENV_FILE=.env.production COMPOSE_FILE=docker-compose.prod.yml ./ops/scripts/xmpp-register-user.sh alice xmpp.chat.example.com replace-me
```

Recommended production DNS and ports:

- `xmpp.<your-domain>` as DNS-only hostname
- `5222` for client c2s
- `5269` reserved for federation later
- `5443` local-only admin HTTP endpoint unless you deliberately expose and protect it

## App Dashboard

The web app exposes a Jabber admin window for usernames listed in `XMPP_ADMIN_USERS`.

Current dashboard fields:

- connected user count
- incoming federation session count
- outgoing federation session count
- sample connected sessions
- compose/profile and client setup commands
- warning state if API credentials or service are missing

## Next Milestones

1. Verify real external client login against `xmpp.memdecks.com`.
2. Lock down TLS and DNS records for XMPP hostnames.
3. Decide whether to provision XMPP users from the app or keep separate test users.
4. Add real federation peer test before attempting message bridging.
